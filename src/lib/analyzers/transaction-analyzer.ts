import { Connection, PublicKey, type ConfirmedSignatureInfo } from "@solana/web3.js";
import { TransactionInfo } from "@/lib/types";
import { lookupThreatIntel } from "@/lib/threat-intel/threat-intelligence";
import { getTransaction } from "@/lib/solana-rpc";

/**
 * Analyze transaction history for suspicious patterns.
 * IMPORTANT: normal high-volume activity is NOT automatically malicious.
 * We only flag when stronger evidence exists (e.g. counterparty in threat DB).
 */
export async function analyzeTransactions(
  connection: Connection,
  address: string,
  signatures: ConfirmedSignatureInfo[],
  maxTransactions = 100
): Promise<{ transactions: TransactionInfo[]; failedChecks: string[] }> {
  const failedChecks: string[] = [];
  const transactions: TransactionInfo[] = [];
  const limited = signatures.slice(0, maxTransactions);

  // Fetch transaction details in batches to avoid rate limits.
  const batchSize = 10;
  for (let i = 0; i < limited.length; i += batchSize) {
    const batch = limited.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((sig) => getTransaction(connection, sig.signature))
    );

    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        const tx = result.value;
        const sigInfo = batch[idx];
        transactions.push(parseTransaction(tx, sigInfo, address));
      }
    });
  }

  // Flag any transaction interacting with a known-malicious address.
  for (const tx of transactions) {
    let flagged = false;
    for (const counterparty of tx.counterparties) {
      const intel = lookupThreatIntel(counterparty);
      if (intel.length > 0) {
        flagged = true;
      }
    }
    if (flagged) {
      tx.riskStatus = "flagged";
    }
  }

  return { transactions, failedChecks };
}

function parseTransaction(
  tx: NonNullable<Awaited<ReturnType<Connection["getTransaction"]>>>,
  sigInfo: ConfirmedSignatureInfo,
  walletAddress: string
): TransactionInfo {
  const counterparties = new Set<string>();
  const programInteractions = new Set<string>();

  // Extract programs and account keys from transaction message
  const message = tx.transaction.message;
  if ("accountKeys" in message) {
    for (const key of message.accountKeys) {
      const addr = key.toBase58();
      if (addr !== walletAddress) {
        counterparties.add(addr);
      }
    }
  }

  // Extract program IDs
  if ("instructions" in message && Array.isArray(message.instructions)) {
    for (const ix of message.instructions) {
      // Handle different instruction formats
      if (ix && typeof ix === "object") {
        const ixAny = ix as Record<string, unknown>;
        const programIdIndex = (ixAny.programIdIndex ?? ixAny.programIndex) as number;
        if (typeof programIdIndex === "number" && message.accountKeys[programIdIndex]) {
          programInteractions.add(message.accountKeys[programIdIndex].toBase58());
        }
      }
    }
  }

  const blockTime = sigInfo.blockTime || tx.blockTime || 0;

  return {
    signature: sigInfo.signature,
    blockTime,
    slot: sigInfo.slot,
    fee: tx.meta?.fee || 0,
    type: "unknown",
    direction: "internal",
    solAmount: 0,
    tokenTransfers: [],
    programInteractions: Array.from(programInteractions),
    counterparties: Array.from(counterparties),
    riskStatus: "clean",
  };
}
