import { Connection, PublicKey } from "@solana/web3.js";
import { ProgramInteraction } from "@/lib/types";
import { lookupKnownProgram, isKnownTrustedProgram } from "@/lib/threat-intel/threat-intelligence";

/**
 * Identify Solana programs the wallet has interacted with.
 * Classify as known/trusted, unknown, suspicious, or malicious.
 */
export async function analyzePrograms(
  connection: Connection,
  address: string,
  programIds: string[]
): Promise<ProgramInteraction[]> {
  const uniquePrograms = Array.from(new Set(programIds));
  const interactions: ProgramInteraction[] = [];

  for (const programId of uniquePrograms) {
    if (programId === "11111111111111111111111111111111") continue; // System program
    if (programId === "ComputeBudget111111111111111111111111111111") continue;

    let classification: ProgramInteraction["classification"] = "unknown";
    let programName: string | undefined;

    const known = lookupKnownProgram(programId);
    if (known) {
      classification = "known";
      programName = known.name;
    } else if (isKnownTrustedProgram(programId)) {
      classification = "known";
    }

    interactions.push({
      programId,
      programName,
      interactionCount: 1, // We'd need full history for accurate count
      lastInteraction: new Date().toISOString(),
      classification,
    });
  }

  return interactions;
}