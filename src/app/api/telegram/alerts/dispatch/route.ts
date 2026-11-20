import { LAMPORTS_PER_SOL, PublicKey, type Connection } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { runScan } from "@/services/scan.service";
import { BOT_TOKEN } from "@/lib/telegram/bot";
import { hasBearerToken } from "@/lib/telegram/auth";
import {
  getDueTelegramAlerts,
  updateTelegramAlertCheckpoint,
  type AlertSubscription,
} from "@/lib/telegram/alert-repository";
import { bot } from "@/lib/telegram/handler";
import type { ScanResult } from "@/lib/types";
import { withRpcRetry } from "@/lib/solana-rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const RISK_SCAN_INTERVAL_MS = 60 * 60 * 1000;
const ALERT_BATCH_SIZE = 5;
const TRANSACTION_BATCH_SIZE = 10;

type ParsedTransaction = NonNullable<
  Awaited<ReturnType<Connection["getParsedTransaction"]>>
>;
type AlertRiskLevel = AlertSubscription["riskLevel"];

function getKnownRiskLevel(scan: ScanResult): AlertRiskLevel {
  if (scan.score === null) return null;
  switch (scan.riskLevel) {
    case "LOW":
    case "MODERATE":
    case "HIGH":
    case "CRITICAL":
      return scan.riskLevel;
    default:
      return null;
  }
}

function getWalletSolDelta(
  transaction: ParsedTransaction,
  address: string,
): number | null {
  const accountIndex = transaction.transaction.message.accountKeys.findIndex(
    (account) => account.pubkey.toBase58() === address,
  );
  if (accountIndex < 0) return null;

  const preBalance = transaction.meta?.preBalances[accountIndex];
  const postBalance = transaction.meta?.postBalances[accountIndex];
  if (preBalance === undefined || postBalance === undefined) return null;
  return (postBalance - preBalance) / LAMPORTS_PER_SOL;
}

function getProgramIds(transaction: ParsedTransaction): string[] {
  return Array.from(new Set(
    transaction.transaction.message.instructions.map((instruction) =>
      instruction.programId.toBase58()
    ),
  ));
}

async function sendAlert(chatId: number, text: string): Promise<void> {
  const result = await bot.sendMessage(chatId, text);
  if (!result?.ok) {
    throw new Error("Telegram did not accept the alert message.");
  }
}

async function processAlert(
  alert: AlertSubscription,
  now: Date,
  allowRiskScan: boolean,
): Promise<boolean> {
  const address = new PublicKey(alert.address);
  const signatures = await withRpcRetry((connection) =>
    connection.getSignaturesForAddress(address, { limit: 100 })
  );
  const nextCheckAt = new Date(now.getTime() + CHECK_INTERVAL_MS).toISOString();
  const latestSignature = signatures[0]?.signature ?? null;
  const isInitialCheck = alert.lastRiskCheckedAt === null && alert.lastSignature === null;

  if (isInitialCheck) {
    await updateTelegramAlertCheckpoint(alert.id, {
      lastSignature: latestSignature,
      lastRiskCheckedAt: now.toISOString(),
      nextCheckAt,
    });
    return false;
  }

  const previousSignatureIndex = alert.lastSignature
    ? signatures.findIndex(({ signature }) => signature === alert.lastSignature)
    : -1;
  const unprocessedSignatures = previousSignatureIndex >= 0
    ? signatures.slice(0, previousSignatureIndex)
    : signatures;
  const transactionBatch = unprocessedSignatures.slice(-TRANSACTION_BATCH_SIZE);
  const notifications: string[] = [];

  if (alert.filters.newTransactions && transactionBatch.length > 0) {
    const links = transactionBatch
      .slice()
      .reverse()
      .map(({ signature }) => `[${signature.slice(0, 8)}...](https://solscan.io/tx/${signature})`);
    notifications.push(
      `🔔 *New transactions*\n\`${alert.address}\`\n${links.join("\n")}`,
    );
  }

  const transactions = transactionBatch.length > 0 &&
      (alert.filters.largeTransfers || alert.filters.programInteractions)
    ? await withRpcRetry((connection) =>
        connection.getParsedTransactions(
          transactionBatch.slice().reverse().map(({ signature }) => signature),
          {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          },
        )
      )
    : [];
  const orderedTransactions = transactionBatch.slice().reverse();
  for (let index = 0; index < orderedTransactions.length; index++) {
    const { signature } = orderedTransactions[index];
    const transaction = transactions[index];
    if (!transaction) continue;

    if (alert.filters.largeTransfers) {
      const delta = getWalletSolDelta(transaction, alert.address);
      if (delta !== null && Math.abs(delta) >= 100) {
        notifications.push(
          `💸 *Large SOL balance change*\n\`${alert.address}\`\n${delta > 0 ? "+" : ""}${delta.toFixed(2)} SOL\n[View transaction](https://solscan.io/tx/${signature})`,
        );
      }
    }

    if (alert.filters.programInteractions) {
      const programIds = getProgramIds(transaction);
      if (programIds.length > 0) {
        notifications.push(
          `⚙️ *Program interaction*\n\`${alert.address}\`\n${programIds.slice(0, 3).map((id) => `\`${id}\``).join("\n")}\n[View transaction](https://solscan.io/tx/${signature})`,
        );
      }
    }
  }

  let riskScanPerformed = false;
  let riskLevel = alert.riskLevel;
  let lastRiskCheckedAt = alert.lastRiskCheckedAt;
  const riskCheckIsDue = !lastRiskCheckedAt ||
    now.getTime() - Date.parse(lastRiskCheckedAt) >= RISK_SCAN_INTERVAL_MS;
  if (allowRiskScan && (transactionBatch.length > 0 || riskCheckIsDue)) {
    riskScanPerformed = true;
    try {
      const scan = await runScan(alert.address);
      const nextRiskLevel = getKnownRiskLevel(scan);
      if (
        alert.filters.riskChange &&
        riskLevel !== null &&
        nextRiskLevel !== null &&
        riskLevel !== nextRiskLevel
      ) {
        notifications.push(
          `⚠️ *Wallet risk level changed*\n\`${alert.address}\`\n${riskLevel} → ${nextRiskLevel}`,
        );
      }
      if (nextRiskLevel !== null) riskLevel = nextRiskLevel;
      lastRiskCheckedAt = now.toISOString();
    } catch (error) {
      console.error("Telegram alert risk scan failed:", alert.id, error);
    }
  }

  for (const notification of notifications) {
    await sendAlert(alert.chatId, notification);
  }

  const lastSignature = transactionBatch[0]?.signature ?? alert.lastSignature ?? latestSignature;
  await updateTelegramAlertCheckpoint(alert.id, {
    lastSignature,
    riskLevel,
    lastRiskCheckedAt,
    nextCheckAt,
  });
  return riskScanPerformed;
}

export async function POST(request: NextRequest) {
  const cronSecrets = [process.env.TELEGRAM_CRON_SECRET, process.env.CRON_SECRET]
    .filter((secret): secret is string => Boolean(secret));
  if (cronSecrets.length === 0) {
    return NextResponse.json({ error: "Alert dispatch is not configured" }, { status: 503 });
  }
  if (!cronSecrets.some(secret => hasBearerToken(request.headers.get("authorization"), secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 503 });
  }

  const now = new Date();
  let alerts: AlertSubscription[];
  try {
    alerts = await getDueTelegramAlerts(now.toISOString(), ALERT_BATCH_SIZE);
  } catch (error) {
    console.error("Telegram alert dispatch could not load subscriptions:", error);
    return NextResponse.json({ error: "Alert storage is unavailable" }, { status: 503 });
  }

  let processed = 0;
  let failed = 0;
  let riskScanPerformed = false;
  for (const alert of alerts) {
    try {
      riskScanPerformed = (await processAlert(alert, now, !riskScanPerformed)) || riskScanPerformed;
      processed++;
    } catch (error) {
      failed++;
      console.error("Telegram alert processing failed:", alert.id, error);
    }
  }

  return NextResponse.json({ processed, failed });
}
