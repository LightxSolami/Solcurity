import { Connection, PublicKey, type ConfirmedSignatureInfo } from "@solana/web3.js";
import { TransactionInfo } from "@/lib/types";
import { getTransaction, RpcExecutor } from "@/lib/solana-rpc";

/**
 * Analyze transaction history for suspicious patterns.
 * Threat-intelligence matching is performed by the scan service after this
 * analyzer has retrieved transaction metadata.
 */
export async function analyzeTransactions(
  connection: Connection,
  address: string,
  signatures: ConfirmedSignatureInfo[],
  maxTransactions = 100,
  executeRpc: RpcExecutor = (operation) => operation(connection)
): Promise<{ transactions: TransactionInfo[]; failedChecks: string[] }> {
  const failedChecks: string[] = [];
  const transactions: TransactionInfo[] = [];
  const limited = signatures.slice(0, maxTransactions);

  // Fetch transaction details in batches to avoid rate limits.
  const batchSize = 10;
  for (let i = 0; i < limited.length; i += batchSize) {
    const batch = limited.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((sig) =>
        executeRpc((rpcConnection) => getTransaction(rpcConnection, sig.signature))
      )
    );

    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        const tx = result.value;
        const sigInfo = batch[idx];
        transactions.push(parseTransaction(tx, sigInfo, address));
      } else {
        failedChecks.push(`transaction_detail:${batch[idx].signature}`);
      }
    });
  }

  return { transactions, failedChecks };
}

function parseTransaction(
  tx: NonNullable<Awaited<ReturnType<Connection["getParsedTransaction"]>>>,
  sigInfo: ConfirmedSignatureInfo,
  walletAddress: string
): TransactionInfo {
  const counterparties = new Set<string>();
  const programInteractions = new Set<string>();
  const message = tx.transaction.message;
  const accountKeys = message.accountKeys.map((key) => key.pubkey.toBase58());
  const walletIndex = accountKeys.indexOf(walletAddress);
  const preBalance = walletIndex >= 0 ? tx.meta?.preBalances[walletIndex] : undefined;
  const postBalance = walletIndex >= 0 ? tx.meta?.postBalances[walletIndex] : undefined;
  const netLamports =
    preBalance !== undefined && postBalance !== undefined ? postBalance - preBalance : null;

  for (const instruction of message.instructions) {
    const programId =
      typeof instruction.programId === "string"
        ? instruction.programId
        : instruction.programId.toBase58();
    programInteractions.add(programId);

    if (!("parsed" in instruction) || !instruction.parsed || typeof instruction.parsed !== "object") {
      continue;
    }

    const parsed = instruction.parsed as { type?: string; info?: Record<string, unknown> };
    const info = parsed.info;
    if (instruction.program === "system" && parsed.type === "transfer" && info) {
      const source = typeof info.source === "string" ? info.source : null;
      const destination = typeof info.destination === "string" ? info.destination : null;
      if (source && source !== walletAddress) counterparties.add(source);
      if (destination && destination !== walletAddress) counterparties.add(destination);
    }
  }

  const tokenTransfers = getTokenTransfers(tx, walletAddress, counterparties);
  const tokenBalances = [
    ...(tx.meta?.preTokenBalances || []),
    ...(tx.meta?.postTokenBalances || []),
  ];
  const direction: TransactionInfo["direction"] =
    netLamports === null
      ? "unknown"
      : netLamports > 0
        ? "incoming"
        : netLamports < 0
          ? "outgoing"
          : "internal";
  const blockTime = sigInfo.blockTime ?? tx.blockTime ?? null;
  const instructionTypes = message.instructions.flatMap((instruction) =>
    "parsed" in instruction && instruction.parsed && typeof instruction.parsed === "object" &&
    "type" in instruction.parsed && typeof instruction.parsed.type === "string"
      ? [instruction.parsed.type]
      : []
  );

  return {
    signature: sigInfo.signature,
    blockTime,
    slot: sigInfo.slot,
    fee: tx.meta?.fee || 0,
    type: instructionTypes.length > 0 ? Array.from(new Set(instructionTypes)).join(", ") : "program interaction",
    direction,
    solAmount: netLamports === null ? null : Math.abs(netLamports) / 1e9,
    tokenTransfers,
    tokenDataAvailable:
      tx.meta?.preTokenBalances !== null &&
      tx.meta?.preTokenBalances !== undefined &&
      tx.meta?.postTokenBalances !== null &&
      tx.meta?.postTokenBalances !== undefined &&
      tokenBalances.every((balance) => Boolean(balance.owner)),
    programInteractions: Array.from(programInteractions),
    counterparties: Array.from(counterparties),
    riskStatus: "unassessed",
  };
}

function getTokenTransfers(
  tx: NonNullable<Awaited<ReturnType<Connection["getParsedTransaction"]>>>,
  walletAddress: string,
  counterparties: Set<string>
): TransactionInfo["tokenTransfers"] {
  const pre = tx.meta?.preTokenBalances || [];
  const post = tx.meta?.postTokenBalances || [];
  const getOwnerBalances = (balances: typeof pre) => {
    const totals = new Map<string, { amount: number; decimals: number }>();
    for (const balance of balances) {
      if (!balance.owner) continue;
      const amount = Number(balance.uiTokenAmount.amount);
      if (!Number.isFinite(amount)) continue;
      const current = totals.get(`${balance.mint}:${balance.owner}`);
      totals.set(`${balance.mint}:${balance.owner}`, {
        amount: (current?.amount || 0) + amount,
        decimals: balance.uiTokenAmount.decimals,
      });
    }
    return totals;
  };
  const before = getOwnerBalances(pre);
  const after = getOwnerBalances(post);
  const keys = new Set([...Array.from(before.keys()), ...Array.from(after.keys())]);
  const ownerDeltas = new Map<string, { mint: string; owner: string; delta: number; decimals: number }>();

  for (const key of Array.from(keys)) {
    const [mint, owner] = key.split(":");
    const previous = before.get(key);
    const current = after.get(key);
    const delta = (current?.amount || 0) - (previous?.amount || 0);
    if (delta !== 0) {
      ownerDeltas.set(key, {
        mint,
        owner,
        delta,
        decimals: current?.decimals ?? previous?.decimals ?? 0,
      });
    }
  }

  return Array.from(ownerDeltas.values())
    .filter((entry) => entry.owner === walletAddress)
    .map((entry) => {
      const otherOwner = Array.from(ownerDeltas.values()).find(
        (candidate) =>
          candidate.mint === entry.mint &&
          candidate.owner !== walletAddress &&
          Math.sign(candidate.delta) !== Math.sign(entry.delta)
      );
      if (otherOwner) counterparties.add(otherOwner.owner);
      return {
        mint: entry.mint,
        amount: Math.abs(entry.delta) / 10 ** entry.decimals,
        direction: entry.delta > 0 ? "incoming" as const : "outgoing" as const,
      };
    });
}
