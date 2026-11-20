/** @jest-environment node */

jest.mock("@/lib/telegram/bot", () => ({
  BOT_TOKEN: "test-bot-token",
}));

jest.mock("@/lib/telegram/handler", () => ({
  bot: { sendMessage: jest.fn() },
}));

jest.mock("@/lib/telegram/alert-repository", () => ({
  getDueTelegramAlerts: jest.fn(),
  updateTelegramAlertCheckpoint: jest.fn(),
}));

jest.mock("@/lib/solana-rpc", () => ({
  withRpcRetry: jest.fn(),
}));

jest.mock("@/services/scan.service", () => ({
  runScan: jest.fn(),
}));

jest.mock("@solana/web3.js", () => ({
  LAMPORTS_PER_SOL: 1_000_000_000,
  PublicKey: class {
    constructor(private readonly value: string) {}

    toBase58() {
      return this.value;
    }
  },
}));

import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/telegram/alerts/dispatch/route";

const repository = jest.requireMock("@/lib/telegram/alert-repository");
const telegram = jest.requireMock("@/lib/telegram/handler").bot;
const { withRpcRetry } = jest.requireMock("@/lib/solana-rpc");
const { runScan } = jest.requireMock("@/services/scan.service");

const address = "11111111111111111111111111111111";
const currentSignature = "current-signature";
const previousSignature = "previous-signature";

function request(authorization?: string): NextRequest {
  return new NextRequest("https://solcurity.test/api/telegram/alerts/dispatch", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

function alert(overrides: Record<string, unknown> = {}) {
  return {
    id: "c27b2f48-58d4-4d08-9b1e-8375b6f52a18",
    userId: 12,
    chatId: 12,
    address,
    createdAt: new Date().toISOString(),
    lastSignature: null,
    riskLevel: null,
    lastRiskCheckedAt: null,
    nextCheckAt: new Date().toISOString(),
    filters: {
      newTransactions: true,
      riskChange: true,
      largeTransfers: true,
      programInteractions: true,
    },
    ...overrides,
  };
}

describe("POST /api/telegram/alerts/dispatch", () => {
  const originalCronSecret = process.env.TELEGRAM_CRON_SECRET;

  beforeEach(() => {
    process.env.TELEGRAM_CRON_SECRET = "test-cron-secret";
    repository.getDueTelegramAlerts.mockReset().mockResolvedValue([]);
    repository.updateTelegramAlertCheckpoint.mockReset().mockResolvedValue(undefined);
    telegram.sendMessage.mockReset().mockResolvedValue({ ok: true });
    withRpcRetry.mockReset();
    runScan.mockReset();
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.TELEGRAM_CRON_SECRET;
    else process.env.TELEGRAM_CRON_SECRET = originalCronSecret;
  });

  it("requires the configured bearer secret", async () => {
    const response = await POST(request("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(repository.getDueTelegramAlerts).not.toHaveBeenCalled();
  });

  it("initializes a baseline without notifying about old transactions", async () => {
    const subscription = alert();
    repository.getDueTelegramAlerts.mockResolvedValue([subscription]);
    withRpcRetry.mockImplementation((operation: (connection: unknown) => Promise<unknown>) =>
      operation({
        getSignaturesForAddress: jest.fn().mockResolvedValue([{ signature: currentSignature }]),
      }),
    );

    const response = await POST(request("Bearer test-cron-secret"));

    expect(response.status).toBe(200);
    expect(telegram.sendMessage).not.toHaveBeenCalled();
    expect(repository.updateTelegramAlertCheckpoint).toHaveBeenCalledWith(
      subscription.id,
      expect.objectContaining({ lastSignature: currentSignature }),
    );
  });

  it("notifies on new transactions, large SOL changes, program use, and risk changes", async () => {
    const subscription = alert({
      lastSignature: previousSignature,
      riskLevel: "LOW",
      lastRiskCheckedAt: new Date(Date.now() - 60 * 60 * 1000 - 1).toISOString(),
    });
    repository.getDueTelegramAlerts.mockResolvedValue([subscription]);
    const transaction = {
      slot: 1,
      blockTime: 1,
      meta: {
        preBalances: [200 * LAMPORTS_PER_SOL],
        postBalances: [0],
        preTokenBalances: [],
        postTokenBalances: [],
      },
      transaction: {
        message: {
          accountKeys: [{ pubkey: new PublicKey(address) }],
          instructions: [{ programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }],
        },
      },
    };
    withRpcRetry.mockImplementation((operation: (connection: unknown) => Promise<unknown>) =>
      operation({
        getSignaturesForAddress: jest.fn().mockResolvedValue([
          { signature: currentSignature },
          { signature: previousSignature },
        ]),
        getParsedTransactions: jest.fn().mockResolvedValue([transaction]),
      }),
    );
    runScan.mockResolvedValue({ score: 75, riskLevel: "HIGH" });

    const response = await POST(request("Bearer test-cron-secret"));

    expect(response.status).toBe(200);
    expect(telegram.sendMessage).toHaveBeenCalledTimes(4);
    const sentMessages = telegram.sendMessage.mock.calls
      .map((call: unknown[]) => String(call[1]))
      .join("\n");
    expect(sentMessages).toContain("New transactions");
    expect(sentMessages).toContain("Large SOL balance change");
    expect(sentMessages).toContain("Program interaction");
    expect(sentMessages).toContain("risk level changed");
    expect(repository.updateTelegramAlertCheckpoint).toHaveBeenCalledWith(
      subscription.id,
      expect.objectContaining({
        lastSignature: currentSignature,
        riskLevel: "HIGH",
      }),
    );
  });
});
