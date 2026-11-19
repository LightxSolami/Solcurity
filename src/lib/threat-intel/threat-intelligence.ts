import { PublicKey } from "@solana/web3.js";
import {
  ThreatIntelScreeningResult,
  ThreatIntelTarget,
} from "@/lib/types";

/**
 * Threat intelligence architecture.
 *
 * The program registry is informational, not a safety endorsement. Threat
 * screening is unavailable until a configured repository provides records
 * and explicit source-coverage metadata.
 */

export interface ThreatIntelSource {
  name: string;
  url: string;
  description: string;
}

export const THREAT_INTEL_SOURCES: ThreatIntelSource[] = [
  {
    name: "Solcurity Threat Intelligence Database",
    url: "https://github.com/LightxSolami/Solcurity/tree/main/supabase/migrations",
    description: "Server-side database for cited, reviewed records; no records or sources are seeded.",
  },
  {
    name: "Local Program Identifier Registry",
    url: "https://github.com/LightxSolami/Solcurity/blob/main/src/lib/threat-intel/threat-intelligence.ts",
    description: "Locally maintained program identifiers; registry presence is not a security endorsement.",
  },
];

/** Known program identifiers; listed programs are not thereby considered safe. */
const KNOWN_PROGRAMS: Record<string, { name: string }> = {
  "11111111111111111111111111111111": { name: "System Program" },
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": { name: "Token Program (SPL)" },
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": { name: "Token-2022 Program" },
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": { name: "Serum DEX v3" },
  "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX": { name: "Serum DEX" },
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": { name: "Jupiter Aggregator v6" },
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": { name: "Raydium Liquidity Pool v4" },
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": { name: "Raydium CLMM" },
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": { name: "Pump.fun" },
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s": { name: "Token Metadata Program" },
  "ComputeBudget111111111111111111111111111111": { name: "Compute Budget Program" },
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": { name: "Associated Token Program" },
  "Vote111111111111111111111111111111111111111": { name: "Vote Program" },
  "Stake11111111111111111111111111111111111111": { name: "Stake Program" },
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr": { name: "Memo Program" },
  "NamesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX": { name: "SNS Name Service" },
};

export function lookupKnownProgram(programId: string): { name: string } | undefined {
  const entry = KNOWN_PROGRAMS[programId];
  return entry ? { name: entry.name } : undefined;
}

export async function screenThreatIntel(
  targets: ThreatIntelTarget[]
): Promise<ThreatIntelScreeningResult> {
  const { supabaseThreatIntelProvider } = await import(
    "@/lib/threat-intel/supabase-repository"
  );
  return supabaseThreatIntelProvider.screen(targets);
}

export function validateAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
