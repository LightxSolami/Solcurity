import { NextRequest, NextResponse } from "next/server";
import { getRecentDiscussions, getLatestDiscussion } from "@/lib/ai-news/discussion-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
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
    return NextResponse.json({ error: "Failed to fetch discussions" }, { status: 500 });
  }
}