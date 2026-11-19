import "server-only";
import { z } from "zod";
import { getThreatIntelAdminClient } from "@/lib/threat-intel/supabase-client";

const AlertRowSchema = z.object({
  id: z.string().uuid(),
  telegram_user_id: z.string().regex(/^\d+$/),
  telegram_chat_id: z.string().regex(/^-?\d+$/),
  address: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  new_transactions: z.boolean(),
  risk_change: z.boolean(),
  large_transfers: z.boolean(),
  program_interactions: z.boolean(),
  last_signature: z.string().min(1).max(88).nullable(),
  risk_level: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).nullable(),
  last_risk_checked_at: z.string().datetime({ offset: true }).nullable(),
  next_check_at: z.string().datetime({ offset: true }),
  created_at: z.string().datetime({ offset: true }),
});

const ALERT_COLUMNS = [
  "id",
  "telegram_user_id",
  "telegram_chat_id",
  "address",
  "new_transactions",
  "risk_change",
  "large_transfers",
  "program_interactions",
  "last_signature",
  "risk_level",
  "last_risk_checked_at",
  "next_check_at",
  "created_at",
].join(",");

export interface AlertSubscription {
  id: string;
  userId: number;
  chatId: number;
  address: string;
  createdAt: string;
  lastSignature: string | null;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | null;
  lastRiskCheckedAt: string | null;
  nextCheckAt: string;
  filters: {
    newTransactions: boolean;
    riskChange: boolean;
    largeTransfers: boolean;
    programInteractions: boolean;
  };
}

export interface AlertCheckpoint {
  lastSignature?: string | null;
  riskLevel?: AlertSubscription["riskLevel"];
  lastRiskCheckedAt?: string | null;
  nextCheckAt: string;
}

function getAdminClient() {
  const result = getThreatIntelAdminClient();
  if (result.status !== "available") {
    throw new Error("Telegram alert storage is not configured.");
  }
  return result.client;
}

function parseAlertRows(value: unknown): AlertSubscription[] {
  const parsed = z.array(AlertRowSchema).safeParse(value);
  if (!parsed.success) {
    console.error("Telegram alert storage returned an invalid response.");
    throw new Error("Telegram alert storage returned invalid data.");
  }
  return parsed.data.map((row) => ({
    id: row.id,
    userId: Number(row.telegram_user_id),
    chatId: Number(row.telegram_chat_id),
    address: row.address,
    createdAt: row.created_at,
    lastSignature: row.last_signature,
    riskLevel: row.risk_level,
    lastRiskCheckedAt: row.last_risk_checked_at,
    nextCheckAt: row.next_check_at,
    filters: {
      newTransactions: row.new_transactions,
      riskChange: row.risk_change,
      largeTransfers: row.large_transfers,
      programInteractions: row.program_interactions,
    },
  }));
}

export async function addTelegramAlert(
  userId: number,
  address: string,
  chatId: number = userId,
): Promise<AlertSubscription> {
  const client = getAdminClient();
  const countResult = await client
    .from("telegram_alert_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("telegram_user_id", String(userId));

  if (countResult.error) {
    console.error("Telegram alert count failed:", countResult.error.code || "unknown");
    throw new Error("Telegram alert storage is unavailable.");
  }
  if (countResult.count === null) {
    throw new Error("Telegram alert storage returned an invalid count.");
  }
  if (countResult.count >= 20) {
    throw new Error("Maximum 20 alerts per user.");
  }

  const result = await client
    .from("telegram_alert_subscriptions")
    .insert({
      telegram_user_id: String(userId),
      telegram_chat_id: String(chatId),
      address,
    })
    .select(ALERT_COLUMNS)
    .single();

  if (result.error?.code === "23505") {
    throw new Error("Alert already exists for this address.");
  }
  if (result.error) {
    console.error("Telegram alert insert failed:", result.error.code || "unknown");
    throw new Error("Telegram alert storage is unavailable.");
  }
  return parseAlertRows([result.data])[0];
}

export async function removeTelegramAlert(userId: number, address: string): Promise<boolean> {
  const result = await getAdminClient()
    .from("telegram_alert_subscriptions")
    .delete()
    .eq("telegram_user_id", String(userId))
    .eq("address", address)
    .select("id");

  if (result.error) {
    console.error("Telegram alert removal failed:", result.error.code || "unknown");
    throw new Error("Telegram alert storage is unavailable.");
  }
  return Array.isArray(result.data) && result.data.length > 0;
}

export async function getTelegramAlertsForUser(userId: number): Promise<AlertSubscription[]> {
  const result = await getAdminClient()
    .from("telegram_alert_subscriptions")
    .select(ALERT_COLUMNS)
    .eq("telegram_user_id", String(userId))
    .order("created_at", { ascending: true });

  if (result.error) {
    console.error("Telegram alert lookup failed:", result.error.code || "unknown");
    throw new Error("Telegram alert storage is unavailable.");
  }
  return parseAlertRows(result.data);
}

export async function getDueTelegramAlerts(
  now: string,
  limit = 100,
): Promise<AlertSubscription[]> {
  const result = await getAdminClient()
    .from("telegram_alert_subscriptions")
    .select(ALERT_COLUMNS)
    .lte("next_check_at", now)
    .order("next_check_at", { ascending: true })
    .limit(limit);

  if (result.error) {
    console.error("Due Telegram alert lookup failed:", result.error.code || "unknown");
    throw new Error("Telegram alert storage is unavailable.");
  }
  return parseAlertRows(result.data);
}

export async function updateTelegramAlertCheckpoint(
  id: string,
  checkpoint: AlertCheckpoint,
): Promise<void> {
  const update: Record<string, string | null> = {
    next_check_at: checkpoint.nextCheckAt,
  };
  if (checkpoint.lastSignature !== undefined) update.last_signature = checkpoint.lastSignature;
  if (checkpoint.riskLevel !== undefined) update.risk_level = checkpoint.riskLevel;
  if (checkpoint.lastRiskCheckedAt !== undefined) {
    update.last_risk_checked_at = checkpoint.lastRiskCheckedAt;
  }

  const result = await getAdminClient()
    .from("telegram_alert_subscriptions")
    .update(update)
    .eq("id", id);

  if (result.error) {
    console.error("Telegram alert checkpoint update failed:", result.error.code || "unknown");
    throw new Error("Telegram alert storage is unavailable.");
  }
}
