import { NextRequest, NextResponse } from "next/server";
import {
  getDiscussionSession,
  getLatestDiscussion,
  getRecentDiscussions,
} from "@/lib/ai-news/discussion-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const requestedLimit = Number(searchParams.get("limit") || "20");
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : 20;
  const id = searchParams.get("id");

  try {
    if (action === "latest") {
      const discussion = await getLatestDiscussion();
      if (!discussion) {
        return NextResponse.json({ discussion: null, message: "No discussions yet" });
      }
      return NextResponse.json({ discussion });
    }

    if (id) {
      const discussion = await getDiscussionSession(id);
      if (!discussion) {
        return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
      }
      return NextResponse.json({ discussion });
    }

    const discussions = await getRecentDiscussions(limit);
    return NextResponse.json({ discussions });
  } catch (error) {
    console.error("Failed to fetch discussions:", error);
    const notConfigured =
      error instanceof Error && error.message === "Discussion storage is not configured.";
    return NextResponse.json(
      { error: notConfigured ? "Discussion storage is not configured" : "Failed to fetch discussions" },
      { status: notConfigured ? 503 : 500 }
    );
  }
}