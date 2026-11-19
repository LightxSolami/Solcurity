import { analyzeTransactions } from "@/lib/analyzers/transaction-analyzer";
import { getTransaction } from "@/lib/solana-rpc";

jest.mock("@/lib/solana-rpc", () => ({
  getTransaction: jest.fn(),
}));

const wallet = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const counterparty = "11111111111111111111111111111111";
const signature = "5".repeat(88);

describe("transaction analyzer data integrity", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses balance deltas, parsed instructions and confirmed block time", async () => {
    (getTransaction as jest.Mock).mockResolvedValue({
      transaction: {
        message: {
          accountKeys: [
            { pubkey: { toBase58: () => wallet } },
            { pubkey: { toBase58: () => counterparty } },
            { pubkey: { toBase58: () => "11111111111111111111111111111111" } },
          ],
          instructions: [{
            program: "system",
            programId: "11111111111111111111111111111111",
            parsed: {
              type: "transfer",
              info: { source: wallet, destination: counterparty, lamports: 1_000_000_000 },
            },
          }],
        },
      },
      meta: {
        fee: 5000,
        preBalances: [1_000_005_000, 0, 0],
        postBalances: [0, 1_000_000_000, 0],
        preTokenBalances: [],
        postTokenBalances: [],
      },
      blockTime: 1_700_000_000,
    });

    const result = await analyzeTransactions(
      {} as never,
      wallet,
      [{ signature, slot: 1, blockTime: 1_700_000_000 } as never]
    );

    expect(result.failedChecks).toEqual([]);
    expect(result.transactions[0]).toMatchObject({
      signature,
      blockTime: 1_700_000_000,
      direction: "outgoing",
      solAmount: 1.000005,
      type: "transfer",
      counterparties: [counterparty],
      riskStatus: "unassessed",
    });
  });

  it("reports missing transaction details as unavailable", async () => {
    (getTransaction as jest.Mock).mockResolvedValue(null);

    const result = await analyzeTransactions(
      {} as never,
      wallet,
      [{ signature, slot: 1, blockTime: null } as never]
    );

    expect(result.transactions).toEqual([]);
    expect(result.failedChecks).toEqual([`transaction_detail:${signature}`]);
  });
});
