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
  isValidPublicKey: jest.fn((address: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)),
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
  screenThreatIntel: jest.fn(async () => ({
    status: "available",
    targets: [],
    recordCount: 0,
    updatedAt: null,
  })),
  lookupKnownProgram: jest.fn(),
}));

import { analyzeWallet } from "@/lib/analyzers/wallet-analyzer";
import { analyzeTransactions } from "@/lib/analyzers/transaction-analyzer";
import { analyzeTokens } from "@/lib/analyzers/token-analyzer";
import { analyzePrograms } from "@/lib/analyzers/program-analyzer";
import { screenThreatIntel } from "@/lib/threat-intel/threat-intelligence";

describe("Scan Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (screenThreatIntel as jest.Mock).mockResolvedValue({
      status: "available",
      targets: [],
      recordCount: 0,
      updatedAt: null,
    });
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

    const result = await runScan(address);

    expect(result.address).toBe(address);
    expect(result.network).toBe("solana-mainnet");
    expect(result.score).toBeNull();
    expect(result.riskLevel).toBe("INCOMPLETE SCAN");
    expect(result.wallet.exists).toBe(true);
    expect(result.wallet.solBalance).toBe(10.5);
    expect(result.findings).toEqual([]);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.summary.checkCounts.unavailable).toBe(1);
    expect(result.checks.find((check) => check.id === "threat_intel")?.status).toBe("UNKNOWN");
    expect(result.scanConfidence).toBeLessThan(100);
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

    (screenThreatIntel as jest.Mock).mockImplementation(async (targets) => ({
      status: "available",
      recordCount: 1,
      updatedAt: "2026-11-01T00:00:00.000Z",
      targets: targets.map((target: { network: string; entityType: string; identifier: string }) => ({
        target,
        records: target.identifier === address
          ? [createIntelRecord(address)]
          : [],
      })),
    }));

    const result = await runScan(address);

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings[0].severity).toBe("HIGH");
    expect(result.findings[0].category).toBe("threat_intel");
    expect(result.findings[0].threatIntelStatus).toBe("confirmed");
    expect(result.findings[0].sourceUrl).toBe("https://example.com/report");
    expect(result.score).toBeLessThan(100);
    expect(result.checks.find((check) => check.id === "threat_intel")?.status).toBe("FAIL");
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

    const result = await runScan(address);

    expect(result.summary.partialScan).toBe(true);
    expect(result.summary.failedChecks).toContain("token_accounts");
    expect(result.summary.failedChecks).toContain("transaction_history");
    expect(result.score).toBeNull();
    expect(result.riskLevel).toBe("INCOMPLETE SCAN");
  });

  it("does not produce a clean score when RPC checks fail", async () => {
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
    const result = await runScan(address);

    // Should return a result with partial scan flag, not throw
    expect(result.summary.partialScan).toBe(true);
    expect(result.summary.failedChecks).toContain("wallet_analysis_failed");
    expect(result.wallet.exists).toBeNull();
    expect(result.score).toBeNull();
    expect(result.riskLevel).toBe("INCOMPLETE SCAN");
    expect(result.summary.checkCounts.unavailable).toBeGreaterThan(0);
  });

  it("marks a confirmed empty transaction history separately from unavailable history", async () => {
    const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    (analyzeWallet as jest.Mock).mockResolvedValue({
      wallet: {
        address,
        exists: true,
        solBalance: 0,
        lamports: 0,
        tokenAccounts: 0,
        nftAccounts: null,
        transactionCount: 0,
      },
      signatures: [],
      failedChecks: [],
    });
    (analyzeTransactions as jest.Mock).mockResolvedValue({ transactions: [], failedChecks: [] });
    (analyzeTokens as jest.Mock).mockResolvedValue({ tokens: [], failedChecks: [] });
    (analyzePrograms as jest.Mock).mockResolvedValue([]);
    const result = await runScan(address);
    expect(result.checks.find((check) => check.id === "transaction_history")?.status).toBe("PASS");
    expect(result.checks.find((check) => check.id === "transaction_details")?.status).toBe("NOT_APPLICABLE");
  });

  it("marks missing account data as unknown rather than safe", async () => {
    const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    (analyzeWallet as jest.Mock).mockResolvedValue({
      wallet: {
        address,
        exists: false,
        solBalance: 0,
        lamports: 0,
        tokenAccounts: 0,
        nftAccounts: null,
        transactionCount: 0,
      },
      signatures: [],
      failedChecks: [],
    });

    (analyzeTransactions as jest.Mock).mockResolvedValue({ transactions: [], failedChecks: [] });
    (analyzeTokens as jest.Mock).mockResolvedValue({ tokens: [], failedChecks: [] });
    (analyzePrograms as jest.Mock).mockResolvedValue([]);
    const result = await runScan(address);
    expect(result.checks.find((check) => check.id === "account_state")?.status).toBe("UNKNOWN");
    expect(result.score).toBeNull();
    expect(result.riskLevel).toBe("INCOMPLETE SCAN");
  });

  it("marks a partially returned transaction history as unavailable", async () => {
    const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    const signature = "5".repeat(88);
    (analyzeWallet as jest.Mock).mockResolvedValue({
      wallet: {
        address,
        exists: true,
        solBalance: 1,
        lamports: 1_000_000_000,
        tokenAccounts: 0,
        nftAccounts: null,
        transactionCount: 1,
      },
      signatures: [{ signature, slot: 1, blockTime: 1_700_000_000 }],
      failedChecks: [],
    });
    (analyzeTransactions as jest.Mock).mockResolvedValue({
      transactions: [],
      failedChecks: [`transaction_detail:${signature}`],
    });
    (analyzeTokens as jest.Mock).mockResolvedValue({ tokens: [], failedChecks: [] });
    (analyzePrograms as jest.Mock).mockResolvedValue([]);
    const result = await runScan(address);
    expect(result.checks.find((check) => check.id === "transaction_details")?.status).toBe("UNKNOWN");
    expect(result.score).toBeNull();
    expect(result.summary.checkCounts.unavailable).toBeGreaterThan(0);
  });

  it("rejects invalid public keys before starting RPC work", async () => {
    await expect(runScan("invalid-address")).rejects.toThrow();
    expect(analyzeWallet).not.toHaveBeenCalled();
  });
});

function createIntelRecord(identifier: string) {
  return {
    id: "test-intel-record",
    network: "solana-mainnet",
    entityType: "wallet" as const,
    identifier,
    category: "malicious_wallet" as const,
    confidence: "HIGH" as const,
    status: "confirmed" as const,
    firstObservedAt: "2026-01-01T00:00:00.000Z",
    lastVerifiedAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2027-01-01T00:00:00.000Z",
    explanation: "Confirmed test intelligence match.",
    source: "Test Source",
    sourceId: "test-source",
    sourceUrl: "https://example.com/report",
    evidence: [{ kind: "url" as const, value: "https://example.com/report" }],
  };
}