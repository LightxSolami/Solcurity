import { runScan } from "@/services/scan.service";

jest.mock("@/lib/solana-rpc", () => ({
  createSolanaConnection: jest.fn(() => ({
    getBalance: jest.fn(),
    getSignaturesForAddress: jest.fn(),
    getTransaction: jest.fn(),
    getParsedTokenAccountsByOwner: jest.fn(),
    getAccountInfo: jest.fn(),
  })),
  withRpcRetry: jest.fn((operation) => operation({
    getBalance: jest.fn(),
    getSignaturesForAddress: jest.fn(),
    getTransaction: jest.fn(),
    getParsedTokenAccountsByOwner: jest.fn(),
    getAccountInfo: jest.fn(),
  })),
}));

jest.mock("@/lib/analyzers/wallet-analyzer", () => ({
  analyzeWallet: jest.fn(),
}));

jest.mock("@/lib/analyzers/transaction-analyzer", () => ({
  analyzeTransactions: jest.fn(),
}));

jest.mock("@/lib/analyzers/token-analyzer", () => ({
  analyzeTokens: jest.fn(),
}));

jest.mock("@/lib/analyzers/program-analyzer", () => ({
  analyzePrograms: jest.fn(),
}));

jest.mock("@/lib/threat-intel/threat-intelligence", () => ({
  lookupThreatIntel: jest.fn(),
  lookupKnownProgram: jest.fn(),
  isKnownTrustedProgram: jest.fn(),
}));

import { analyzeWallet } from "@/lib/analyzers/wallet-analyzer";
import { analyzeTransactions } from "@/lib/analyzers/transaction-analyzer";
import { analyzeTokens } from "@/lib/analyzers/token-analyzer";
import { analyzePrograms } from "@/lib/analyzers/program-analyzer";
import { lookupThreatIntel } from "@/lib/threat-intel/threat-intelligence";

describe("Scan Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns structured scan result for valid address", async () => {
    const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

    (analyzeWallet as jest.Mock).mockResolvedValue({
      wallet: {
        address,
        exists: true,
        solBalance: 10.5,
        lamports: 10500000000,
        tokenAccounts: 5,
        nftAccounts: 1,
        transactionCount: 50,
        firstActivity: "2023-01-01T00:00:00.000Z",
        lastActivity: "2024-01-01T00:00:00.000Z",
        approximateAgeDays: 365,
      },
      signatures: [],
      failedChecks: [],
    });

    (analyzeTransactions as jest.Mock).mockResolvedValue({
      transactions: [],
      failedChecks: [],
    });

    (analyzeTokens as jest.Mock).mockResolvedValue({
      tokens: [],
      failedChecks: [],
    });

    (analyzePrograms as jest.Mock).mockResolvedValue([]);

    (lookupThreatIntel as jest.Mock).mockReturnValue([]);

    const result = await runScan(address);

    expect(result.address).toBe(address);
    expect(result.network).toBe("solana-mainnet");
    expect(result.score).toBe(100);
    expect(result.riskLevel).toBe("LOW");
    expect(result.wallet.exists).toBe(true);
    expect(result.wallet.solBalance).toBe(10.5);
    expect(result.findings).toEqual([]);
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("includes findings when threat intel matches", async () => {
    const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

    (analyzeWallet as jest.Mock).mockResolvedValue({
      wallet: {
        address,
        exists: true,
        solBalance: 10.5,
        lamports: 10500000000,
        tokenAccounts: 0,
        nftAccounts: 0,
        transactionCount: 0,
      },
      signatures: [],
      failedChecks: [],
    });

    (analyzeTransactions as jest.Mock).mockResolvedValue({
      transactions: [],
      failedChecks: [],
    });

    (analyzeTokens as jest.Mock).mockResolvedValue({
      tokens: [],
      failedChecks: [],
    });

    (analyzePrograms as jest.Mock).mockResolvedValue([]);

    (lookupThreatIntel as jest.Mock).mockImplementation((addr) => {
      if (addr === address) {
        return [{
          address,
          type: "malicious" as const,
          classification: "Known drainer",
          confidence: "HIGH" as const,
          source: "Test Source",
          sourceUrl: "https://example.com",
          reason: "Test reason",
        }];
      }
      return [];
    });

    const result = await runScan(address);

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings[0].severity).toBe("HIGH");
    expect(result.findings[0].category).toBe("threat_intel");
    expect(result.score).toBeLessThan(100);
  });

  it("includes partial scan flag when checks fail", async () => {
    const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

    (analyzeWallet as jest.Mock).mockResolvedValue({
      wallet: {
        address,
        exists: true,
        solBalance: 0,
        lamports: 0,
        tokenAccounts: 0,
        nftAccounts: 0,
        transactionCount: 0,
      },
      signatures: [],
      failedChecks: ["token_accounts"],
    });

    (analyzeTransactions as jest.Mock).mockResolvedValue({
      transactions: [],
      failedChecks: ["transaction_history"],
    });

    (analyzeTokens as jest.Mock).mockResolvedValue({
      tokens: [],
      failedChecks: [],
    });

    (analyzePrograms as jest.Mock).mockResolvedValue([]);

    (lookupThreatIntel as jest.Mock).mockReturnValue([]);

    const result = await runScan(address);

    expect(result.summary.partialScan).toBe(true);
    expect(result.summary.failedChecks).toContain("token_accounts");
    expect(result.summary.failedChecks).toContain("transaction_history");
  });

  it("handles RPC failure gracefully - returns partial result instead of throwing", async () => {
    const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

    (analyzeWallet as jest.Mock).mockRejectedValue(new Error("RPC timeout"));
    (analyzeTransactions as jest.Mock).mockResolvedValue({
      transactions: [],
      failedChecks: [],
    });
    (analyzeTokens as jest.Mock).mockResolvedValue({
      tokens: [],
      failedChecks: [],
    });
    (analyzePrograms as jest.Mock).mockResolvedValue([]);
    (lookupThreatIntel as jest.Mock).mockReturnValue([]);

    const result = await runScan(address);

    // Should return a result with partial scan flag, not throw
    expect(result.summary.partialScan).toBe(true);
    expect(result.summary.failedChecks).toContain("wallet_analysis_failed");
    expect(result.wallet.exists).toBe(false);
    expect(result.score).toBe(100); // No findings = 100 score
  });
});