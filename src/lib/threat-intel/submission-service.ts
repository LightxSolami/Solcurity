import "server-only";
import { createHash, createHmac } from "crypto";
import { z } from "zod";
import { getThreatIntelAdminClient } from "@/lib/threat-intel/supabase-client";
import {
  CommunitySubmissionInput,
  ModeratorDecisionInput,
} from "@/lib/threat-intel/submission-schema";

const InsertedSubmissionSchema = z.object({ id: z.string().uuid() });

export type SubmissionResult =
  | { status: "created"; id: string }
  | { status: "duplicate" | "rate_limited" | "unavailable" };

export async function submitCommunityReport(
  submission: CommunitySubmissionInput,
  clientIp: string
): Promise<SubmissionResult> {
  const admin = getThreatIntelAdminClient();
  if (admin.status !== "available") return { status: "unavailable" };

  const rateLimitSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rateLimitSecret) return { status: "unavailable" };

  const rateKeyHash = createHmac("sha256", rateLimitSecret)
    .update(clientIp.split(",")[0].trim() || "unknown")
    .digest("hex");
  const { data: allowed, error: rateLimitError } = await admin.client.rpc(
    "reserve_threat_intel_submission_slot",
    {
      p_key_hash: rateKeyHash,
      p_max_requests: 5,
      p_window_seconds: 3600,
    }
  );

  if (rateLimitError) {
    console.error("Threat intelligence rate-limit check failed:", rateLimitError.code || "unknown");
    return { status: "unavailable" };
  }
  if (allowed !== true) return { status: "rate_limited" };

  const evidenceValue = submission.evidenceKind === "url"
    ? new URL(submission.evidenceValue).toString()
    : submission.evidenceValue;
  const dedupeMaterial = [
    submission.network,
    submission.entityType,
    submission.identifier,
    submission.evidenceKind,
    evidenceValue,
  ].join("\n");
  const dedupeHash = createHash("sha256").update(dedupeMaterial).digest("hex");

  const { data, error } = await admin.client
    .from("community_submissions")
    .insert({
      network: submission.network,
      entity_type: submission.entityType,
      identifier: submission.identifier,
      category: submission.category,
      evidence_kind: submission.evidenceKind,
      evidence_value: evidenceValue,
      explanation: submission.explanation,
      dedupe_hash: dedupeHash,
    })
    .select("id")
    .single();

  if (error?.code === "23505") return { status: "duplicate" };
  if (error) {
    console.error("Threat intelligence submission insert failed:", error.code || "unknown");
    return { status: "unavailable" };
  }

  const inserted = InsertedSubmissionSchema.safeParse(data);
  if (!inserted.success) {
    console.error("Threat intelligence submission returned an invalid response.");
    return { status: "unavailable" };
  }
  return { status: "created", id: inserted.data.id };
}

const PendingSubmissionSchema = z.object({
  id: z.string().uuid(),
  network: z.enum(["solana-mainnet", "solana-devnet", "solana-testnet"]),
  entity_type: z.enum(["wallet", "token_mint", "program", "transaction_signature"]),
  identifier: z.string().min(1),
  category: z.string().min(1),
  evidence_kind: z.enum(["url", "transaction_signature"]),
  evidence_value: z.string().min(1),
  explanation: z.string().min(1),
  created_at: z.string().datetime({ offset: true }),
});

const ApprovedSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  source_url: z.string().url(),
  license_basis: z.string().min(1),
});

interface ApprovedModerationSource {
  id: string;
  name: string;
  url: string;
  licenseBasis: string;
}

export type ModerationQueueResult =
  | {
      status: "available";
      submissions: z.infer<typeof PendingSubmissionSchema>[];
      sources: ApprovedModerationSource[];
    }
  | {
      status: "unavailable";
      reason: "not_configured" | "invalid_configuration" | "database_unavailable" | "invalid_response";
    };

export async function getModerationQueue(): Promise<ModerationQueueResult> {
  const admin = getThreatIntelAdminClient();
  if (admin.status !== "available") {
    return { status: "unavailable", reason: admin.reason };
  }

  const [submissionsResult, sourcesResult] = await Promise.all([
    admin.client
      .from("community_submissions")
      .select("id,network,entity_type,identifier,category,evidence_kind,evidence_value,explanation,created_at")
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: true })
      .limit(100),
    admin.client
      .from("intelligence_sources")
      .select("id,name,source_url,license_basis")
      .eq("authorization_status", "approved")
      .eq("enabled", true)
      .order("name", { ascending: true })
      .limit(100),
  ]);

  if (submissionsResult.error || sourcesResult.error) {
    const code = submissionsResult.error?.code || sourcesResult.error?.code || "unknown";
    console.error("Threat intelligence moderation queue query failed:", code);
    return { status: "unavailable", reason: "database_unavailable" };
  }
  if (!Array.isArray(submissionsResult.data) || !Array.isArray(sourcesResult.data)) {
    return { status: "unavailable", reason: "invalid_response" };
  }

  const submissions: z.infer<typeof PendingSubmissionSchema>[] = [];
  for (const row of submissionsResult.data as unknown[]) {
    const parsed = PendingSubmissionSchema.safeParse(row);
    if (!parsed.success) return { status: "unavailable", reason: "invalid_response" };
    submissions.push(parsed.data);
  }

  const sources: ApprovedModerationSource[] = [];
  for (const row of sourcesResult.data as unknown[]) {
    const parsed = ApprovedSourceSchema.safeParse(row);
    if (!parsed.success || new URL(parsed.data.source_url).protocol !== "https:") {
      return { status: "unavailable", reason: "invalid_response" };
    }
    sources.push({
      id: parsed.data.id,
      name: parsed.data.name,
      url: parsed.data.source_url,
      licenseBasis: parsed.data.license_basis,
    });
  }

  return { status: "available", submissions, sources };
}

export type ModerationResult =
  | { status: "completed"; recordId: string | null }
  | { status: "conflict" }
  | { status: "unavailable" };

export async function moderateCommunityReport(
  decision: ModeratorDecisionInput
): Promise<ModerationResult> {
  const admin = getThreatIntelAdminClient();
  if (admin.status !== "available") return { status: "unavailable" };

  if (decision.action === "approved") {
    const expiry = Date.parse(decision.expiresAt || "");
    const now = Date.now();
    if (!Number.isFinite(expiry) || expiry <= now || expiry > now + 90 * 24 * 60 * 60 * 1000) {
      return { status: "conflict" };
    }
  }

  const { data, error } = await admin.client.rpc("moderate_threat_intel_submission", {
    p_submission_id: decision.submissionId,
    p_action: decision.action,
    p_actor_id: "configured_moderator",
    p_notes: decision.notes,
    p_source_id: decision.sourceId ?? null,
    p_record_status: decision.status ?? null,
    p_confidence: decision.confidence ?? null,
    p_expires_at: decision.expiresAt ?? null,
  });

  if (error) {
    if (error.code === "P0001") return { status: "conflict" };
    console.error("Threat intelligence moderation action failed:", error.code || "unknown");
    return { status: "unavailable" };
  }

  if (decision.action === "approved") {
    const recordId = z.string().uuid().safeParse(data);
    if (!recordId.success) {
      console.error("Threat intelligence moderation returned an invalid record ID.");
      return { status: "unavailable" };
    }
    return { status: "completed", recordId: recordId.data };
  }
  if (data !== null) {
    console.error("Threat intelligence moderation returned an unexpected record ID.");
    return { status: "unavailable" };
  }
  return { status: "completed", recordId: null };
}
