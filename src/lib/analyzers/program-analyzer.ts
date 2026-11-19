import { ProgramInteraction, TransactionInfo } from "@/lib/types";
import { lookupKnownProgram } from "@/lib/threat-intel/threat-intelligence";

/**
 * Identify Solana programs the wallet has interacted with.
 * Match observed program IDs against the local name registry. Registry
 * membership does not establish that a program is safe.
 */
export async function analyzePrograms(
  transactions: TransactionInfo[]
): Promise<ProgramInteraction[]> {
  const interactionsByProgram = new Map<string, TransactionInfo[]>();
  for (const transaction of transactions) {
    for (const programId of Array.from(new Set(transaction.programInteractions))) {
      const interactions = interactionsByProgram.get(programId) || [];
      interactions.push(transaction);
      interactionsByProgram.set(programId, interactions);
    }
  }

  const interactions: ProgramInteraction[] = [];

  for (const [programId, programTransactions] of Array.from(interactionsByProgram.entries())) {
    if (programId === "11111111111111111111111111111111") continue; // System program
    if (programId === "ComputeBudget111111111111111111111111111111") continue;

    let classification: ProgramInteraction["classification"] = "unknown";
    let programName: string | undefined;

    const known = lookupKnownProgram(programId);
    if (known) {
      classification = "known";
      programName = known.name;
    }

    interactions.push({
      programId,
      programName,
      interactionCount: Array.from(new Set(programTransactions.map((transaction) => transaction.signature))).length,
      lastInteraction: programTransactions.reduce((latest: string | null, transaction) => {
        if (transaction.blockTime === null) return latest;
        const timestamp = new Date(transaction.blockTime * 1000).toISOString();
        return latest === null || timestamp > latest ? timestamp : latest;
      }, null),
      classification,
    });
  }

  return interactions;
}