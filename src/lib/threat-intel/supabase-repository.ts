import "server-only";
import { z } from "zod";
import {
  ThreatIntelEntry,
  ThreatIntelScreeningResult,
  ThreatIntelTarget,
} from "@/lib/types";
import { getThreatIntelAdminClient } from "@/lib/threat-intel/supabase-client";
import {
  isValidHttpsEvidenceUrl,
  isValidSolanaTransactionSignature,
} from "@/lib/threat-intel/submission-schema";
import type { ThreatIntelProviderAdapter } from "@/lib/threat-intel/provider";

const EvidenceSchema = z.object({
  kind: z.enum(["url", "transaction_signature", "text"]),
  value: z.string().min(1),
}).superRefine((evidence, context) => {
  if (
    (evidence.kind === "url" && !isValidHttpsEvidenceUrl(evidence.value)) ||
    (evidence.kind === "transaction_signature" &&
      !isValidSolanaTransactionSignature(evidence.value))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Threat-intelligence evidence is invalid.",
    });
  }
});

export const JoinedRecordSchema = z.object({
  id: z.string().uuid(),
  network: z.enum(["solana-mainnet", "solana-devnet", "solana-testnet"]),
  entity_type: z.enum([
    "wallet",
    "token_mint",
    "program",
    "transaction_signature",
    "funding_relationship",
  ]),
  identifier: z.string().min(1),
  category: z.enum([
    "malicious_wallet",
    "scam_token",
    "malicious_program",
    "drainer",
    "phishing",
    "suspicious_funding",
    "sanctions_exposure",
    "other",
  ]),
  evidence: z.array(EvidenceSchema).min(1),
  source_id: z.string().uuid(),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  status: z.enum(["confirmed", "suspected", "disputed", "revoked"]),
  first_observed_at: z.string().datetime({ offset: true }),
  last_verified_at: z.string().datetime({ offset: true }),
  expires_at: z.string().datetime({ offset: true }),
  explanation: z.string().min(1),
  updated_at: z.string().datetime({ offset: true }),
  source: z.union([
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      source_url: z.string().url(),
      authorization_status: z.enum(["not_reviewed", "approved", "rejected", "revoked"]),
      enabled: z.boolean(),
    }),
    z.array(z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      source_url: z.string().url(),
      authorization_status: z.enum(["not_reviewed", "approved", "rejected", "revoked"]),
      enabled: z.boolean(),
    })).length(1),
  ]),
});

export async function screenThreatIntelWithSupabase(
  targets: ThreatIntelTarget[]
): Promise<ThreatIntelScreeningResult> {
  const admin = getThreatIntelAdminClient();
  if (admin.status !== "available") {
    return {
      status: "unavailable",
      targets: [],
      recordCount: 0,
      updatedAt: null,
      reason: admin.reason,
    };
  }

  if (targets.length === 0) {
    return {
      status: "available",
      targets: [],
      recordCount: 0,
      updatedAt: null,
    };
  }

  const { data, error } = await admin.client.rpc("screen_threat_intel_targets", {
    p_targets: targets,
  });

  if (error) {
    console.error("Threat intelligence database query failed:", error.code || "unknown");
    return {
      status: "unavailable",
      targets: [],
      recordCount: 0,
      updatedAt: null,
      reason: "database_unavailable",
    };
  }

  if (!Array.isArray(data)) {
    return {
      status: "unavailable",
      targets: [],
      recordCount: 0,
      updatedAt: null,
      reason: "invalid_response",
    };
  }

  const records: ThreatIntelEntry[] = [];
  let latestUpdate: string | null = null;
  for (const row of data as unknown[]) {
    const parsed = JoinedRecordSchema.safeParse(row);
    if (!parsed.success) {
      console.error("Threat intelligence database returned an invalid record.");
      return {
        status: "unavailable",
        targets: [],
        recordCount: 0,
        updatedAt: null,
        reason: "invalid_response",
      };
    }

    const source = Array.isArray(parsed.data.source)
      ? parsed.data.source[0]
      : parsed.data.source;
    if (
      parsed.data.source_id !== source.id ||
      source.authorization_status !== "approved" ||
      !source.enabled ||
      new URL(source.source_url).protocol !== "https:"
    ) {
      console.error("Threat intelligence record failed source validation.");
      return {
        status: "unavailable",
        targets: [],
        recordCount: 0,
        updatedAt: null,
        reason: "invalid_response",
      };
    }

    records.push(toThreatIntelEntry(parsed.data, source.name, source.source_url));
    if (!latestUpdate || Date.parse(parsed.data.updated_at) > Date.parse(latestUpdate)) {
      latestUpdate = parsed.data.updated_at;
    }
  }

  return {
    status: "available",
    recordCount: records.length,
    updatedAt: latestUpdate,
    targets: targets.map((target) => ({
      target,
      records: records.filter((record) =>
        record.network === target.network &&
        record.entityType === target.entityType &&
        record.identifier === target.identifier
      ),
    })),
  };
}

export const supabaseThreatIntelProvider: ThreatIntelProviderAdapter = {
  id: "supabase",
  screen: screenThreatIntelWithSupabase,
};

export function toThreatIntelEntry(
  row: z.infer<typeof JoinedRecordSchema>,
  source: string,
  sourceUrl: string
): ThreatIntelEntry {
  return {
    id: row.id,
    network: row.network,
    entityType: row.entity_type,
    identifier: row.identifier,
    category: row.category,
    evidence: row.evidence,
    sourceId: row.source_id,
    source,
    sourceUrl,
    confidence: row.confidence,
    status: row.status,
    firstObservedAt: row.first_observed_at,
    lastVerifiedAt: row.last_verified_at,
    expiresAt: row.expires_at,
    explanation: row.explanation,
  };
}

const SourceSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  source_url: z.string().url(),
  authorization_status: z.enum(["not_reviewed", "approved", "rejected", "revoked"]),
  enabled: z.boolean(),
  updated_at: z.string().datetime({ offset: true }),
});

const SourceHealthSchema = z.object({
  status: z.enum(["healthy", "degraded", "unavailable", "disabled"]),
  last_attempt_at: z.string().datetime({ offset: true }).nullable(),
  last_success_at: z.string().datetime({ offset: true }).nullable(),
  last_record_at: z.string().datetime({ offset: true }).nullable(),
  records_seen: z.number().int().nonnegative(),
  detail: z.string(),
  source: z.object({
    name: z.string().min(1),
    enabled: z.boolean(),
    authorization_status: z.enum(["not_reviewed", "approved", "rejected", "revoked"]),
  }),
});

export interface ThreatIntelDashboardData {
  status: "available" | "unavailable";
  reason?: "not_configured" | "invalid_configuration" | "database_unavailable" | "invalid_response";
  confirmedCount: number;
  suspectedCount: number;
  records: ThreatIntelEntry[];
  sources: {
    id: string;
    name: string;
    url: string;
    updatedAt: string;
  }[];
  sourceHealth: {
    name: string;
    status: "healthy" | "degraded" | "unavailable" | "disabled";
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastRecordAt: string | null;
    recordsSeen: number;
    detail: string;
  }[];
  lastDatabaseUpdate: string | null;
}

function unavailableDashboard(
  reason: NonNullable<ThreatIntelDashboardData["reason"]>
): ThreatIntelDashboardData {
  return {
    status: "unavailable",
    reason,
    confirmedCount: 0,
    suspectedCount: 0,
    records: [],
    sources: [],
    sourceHealth: [],
    lastDatabaseUpdate: null,
  };
}

export async function getThreatIntelDashboardData(): Promise<ThreatIntelDashboardData> {
  const admin = getThreatIntelAdminClient();
  if (admin.status !== "available") return unavailableDashboard(admin.reason);

  const now = new Date().toISOString();
  const recordSelect =
    "id,network,entity_type,identifier,category,evidence,source_id,confidence,status,first_observed_at,last_verified_at,expires_at,explanation,updated_at,source:intelligence_sources!inner(id,name,source_url,authorization_status,enabled)";

  const queryResults = await Promise.all([
      admin.client
        .from("intelligence_records")
        .select(recordSelect, { count: "exact" })
        .in("status", ["confirmed", "suspected"])
        .gt("expires_at", now)
        .lte("last_verified_at", now)
        .eq("source.authorization_status", "approved")
        .eq("source.enabled", true)
        .order("last_verified_at", { ascending: false })
        .limit(100),
      admin.client
        .from("intelligence_records")
        .select("id,source:intelligence_sources!inner(id)", { count: "exact", head: true })
        .eq("status", "confirmed")
        .gt("expires_at", now)
        .lte("last_verified_at", now)
        .eq("source.authorization_status", "approved")
        .eq("source.enabled", true),
      admin.client
        .from("intelligence_records")
        .select("id,source:intelligence_sources!inner(id)", { count: "exact", head: true })
        .eq("status", "suspected")
        .gt("expires_at", now)
        .lte("last_verified_at", now)
        .eq("source.authorization_status", "approved")
        .eq("source.enabled", true),
      admin.client
        .from("intelligence_sources")
        .select("id,slug,name,source_url,authorization_status,enabled,updated_at", { count: "exact" })
        .eq("authorization_status", "approved")
        .eq("enabled", true)
        .order("updated_at", { ascending: false })
        .limit(100),
      admin.client
        .from("source_health")
        .select("status,last_attempt_at,last_success_at,last_record_at,records_seen,detail,source:intelligence_sources!inner(name,enabled,authorization_status)")
        .eq("source.enabled", true)
        .eq("source.authorization_status", "approved")
        .order("updated_at", { ascending: false })
        .limit(100),
    ]).catch((error: unknown) => {
      console.error(
        "Threat intelligence dashboard database request failed:",
        error instanceof Error ? error.name : "unknown"
      );
      return null;
    });
  if (!queryResults) return unavailableDashboard("database_unavailable");
  const [recordsResult, confirmedResult, suspectedResult, sourcesResult, healthResult] =
    queryResults;

  if (
    recordsResult.error ||
    confirmedResult.error ||
    suspectedResult.error ||
    sourcesResult.error ||
    healthResult.error
  ) {
    const errorCode =
      recordsResult.error?.code ||
      confirmedResult.error?.code ||
      suspectedResult.error?.code ||
      sourcesResult.error?.code ||
      healthResult.error?.code ||
      "unknown";
    console.error("Threat intelligence dashboard query failed:", errorCode);
    return unavailableDashboard("database_unavailable");
  }

  if (
    !Array.isArray(recordsResult.data) ||
    !Array.isArray(sourcesResult.data) ||
    !Array.isArray(healthResult.data) ||
    confirmedResult.count === null ||
    suspectedResult.count === null
  ) {
    return unavailableDashboard("invalid_response");
  }

  const records: ThreatIntelEntry[] = [];
  const updates: string[] = [];
  for (const row of recordsResult.data as unknown[]) {
    const parsed = JoinedRecordSchema.safeParse(row);
    if (!parsed.success) return unavailableDashboard("invalid_response");
    const source = Array.isArray(parsed.data.source)
      ? parsed.data.source[0]
      : parsed.data.source;
    if (
      parsed.data.source_id !== source.id ||
      source.authorization_status !== "approved" ||
      !source.enabled ||
      new URL(source.source_url).protocol !== "https:"
    ) {
      return unavailableDashboard("invalid_response");
    }
    records.push(toThreatIntelEntry(parsed.data, source.name, source.source_url));
    updates.push(parsed.data.updated_at);
  }

  const sources: ThreatIntelDashboardData["sources"] = [];
  for (const row of sourcesResult.data as unknown[]) {
    const parsed = SourceSchema.safeParse(row);
    if (!parsed.success || parsed.data.authorization_status !== "approved" ||
      !parsed.data.enabled || new URL(parsed.data.source_url).protocol !== "https:") {
      return unavailableDashboard("invalid_response");
    }
    sources.push({
      id: parsed.data.id,
      name: parsed.data.name,
      url: parsed.data.source_url,
      updatedAt: parsed.data.updated_at,
    });
    updates.push(parsed.data.updated_at);
  }

  const sourceHealth: ThreatIntelDashboardData["sourceHealth"] = [];
  for (const row of healthResult.data as unknown[]) {
    const parsed = SourceHealthSchema.safeParse(row);
    if (!parsed.success ||
      parsed.data.source.authorization_status !== "approved" ||
      !parsed.data.source.enabled) {
      return unavailableDashboard("invalid_response");
    }
    sourceHealth.push({
      name: parsed.data.source.name,
      status: parsed.data.status,
      lastAttemptAt: parsed.data.last_attempt_at,
      lastSuccessAt: parsed.data.last_success_at,
      lastRecordAt: parsed.data.last_record_at,
      recordsSeen: parsed.data.records_seen,
      detail: parsed.data.detail,
    });
    if (parsed.data.last_attempt_at) updates.push(parsed.data.last_attempt_at);
    if (parsed.data.last_success_at) updates.push(parsed.data.last_success_at);
  }

  const lastDatabaseUpdate = updates.length > 0
    ? updates.reduce((latest, candidate) =>
        Date.parse(candidate) > Date.parse(latest) ? candidate : latest
      )
    : null;

  return {
    status: "available",
    confirmedCount: confirmedResult.count,
    suspectedCount: suspectedResult.count,
    records,
    sources,
    sourceHealth,
    lastDatabaseUpdate,
  };
}
