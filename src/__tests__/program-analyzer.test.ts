import { analyzePrograms } from "@/lib/analyzers/program-analyzer";
import { TransactionInfo } from "@/lib/types";

jest.mock("@/lib/threat-intel/threat-intelligence", () => ({
  lookupKnownProgram: jest.fn(),
}));

describe("program analyzer", () => {
  it("counts unique programs from observed transactions and keeps unknown IDs unknown", async () => {
    const transactions = [
      createTransaction("sig-1", 1_700_000_000, ["Unknown111111111111111111111111111111111"]),
      createTransaction("sig-2", 1_700_000_100, ["Unknown111111111111111111111111111111111"]),
      createTransaction("sig-2", 1_700_000_100, ["Unknown111111111111111111111111111111111"]),
    ];

    await expect(analyzePrograms(transactions)).resolves.toEqual([
      expect.objectContaining({
        programId: "Unknown111111111111111111111111111111111",
        interactionCount: 2,
        lastInteraction: new Date(1_700_000_100 * 1000).toISOString(),
        classification: "unknown",
      }),
    ]);
  });
});

function createTransaction(
  signature: string,
  blockTime: number | null,
  programInteractions: string[]
): TransactionInfo {
  return {
    signature,
    blockTime,
    slot: 1,
    fee: 0,
    type: "instruction",
    direction: "unknown",
    solAmount: null,
    tokenTransfers: [],
    tokenDataAvailable: true,
    programInteractions,
    counterparties: [],
    riskStatus: "unassessed",
  };
}
