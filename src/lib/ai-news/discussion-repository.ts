import "server-only";
import { z } from "zod";
import { getThreatIntelAdminClient } from "@/lib/threat-intel/supabase-client";
import { DiscussionSession, DiscussionMessage } from "./orchestrator";

const DiscussionRowSchema = z.object({
  id: z.string(),
  session_data: z.string(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export interface StoredDiscussion {
  id: string;
  session: DiscussionSession;
  createdAt: string;
  updatedAt: string;
}

function getAdminClient() {
  const result = getThreatIntelAdminClient();
  if (result.status !== "available") {
    throw new Error("Discussion storage is not configured.");
  }
  return result.client;
}

function parseSessionData(data: string): DiscussionSession {
  try {
    return JSON.parse(data);
  } catch {
    throw new Error("Invalid session data");
  }
}

export async function saveDiscussionSession(session: DiscussionSession): Promise<void> {
  const client = getAdminClient();
  const result = await client
    .from("ai_news_discussions")
    .upsert({
      id: session.id,
      session_data: JSON.stringify(session),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (result.error) {
    console.error("Failed to save discussion:", result.error);
    throw new Error("Failed to save discussion session");
  }
}

export async function getDiscussionSession(id: string): Promise<DiscussionSession | null> {
  const client = getAdminClient();
  const result = await client
    .from("ai_news_discussions")
    .select("session_data")
    .eq("id", id)
    .single();

  if (result.error) {
    if (result.error.code === "PGRST116") return null;
    console.error("Failed to get discussion:", result.error);
    throw new Error("Failed to retrieve discussion session");
  }

  return parseSessionData(result.data.session_data);
}

export async function getRecentDiscussions(limit = 20): Promise<StoredDiscussion[]> {
  const client = getAdminClient();
  const result = await client
    .from("ai_news_discussions")
    .select("id, session_data, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (result.error) {
    console.error("Failed to get discussions:", result.error);
    throw new Error("Failed to retrieve discussions");
  }

  return (result.data || []).map(row => ({
    id: row.id,
    session: parseSessionData(row.session_data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getLatestDiscussion(): Promise<StoredDiscussion | null> {
  const client = getAdminClient();
  const result = await client
    .from("ai_news_discussions")
    .select("id, session_data, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (result.error) {
    if (result.error.code === "PGRST116") return null;
    console.error("Failed to get latest discussion:", result.error);
    throw new Error("Failed to retrieve latest discussion");
  }

  return {
    id: result.data.id,
    session: parseSessionData(result.data.session_data),
    createdAt: result.data.created_at,
    updatedAt: result.data.updated_at,
  };
}

export async function deleteOldDiscussions(olderThanDays = 30): Promise<number> {
  const client = getAdminClient();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const result = await client
    .from("ai_news_discussions")
    .delete()
    .lt("created_at", cutoff);

  if (result.error) {
    console.error("Failed to delete old discussions:", result.error);
    return 0;
  }

  return result.count || 0;
}