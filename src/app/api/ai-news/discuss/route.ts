import { NextRequest, NextResponse } from "next/server";
import { hasBearerToken } from "@/lib/telegram/auth";
import { fetchAllNews, getTopNews } from "@/lib/ai-news/news-aggregator";
import { runDiscussionSession, runQuickDiscussion } from "@/lib/ai-news/orchestrator";
import { saveDiscussionSession, deleteOldDiscussions } from "@/lib/ai-news/discussion-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.AI_NEWS_CRON_SECRET || process.env.TELEGRAM_CRON_SECRET;
const DISCUSSION_INTERVAL_HOURS = Number(process.env.AI_NEWS_INTERVAL_HOURS) || 6;
const MAX_NEWS_ITEMS = Number(process.env.AI_NEWS_MAX_ITEMS) || 8;
const QUICK_MODE = process.env.AI_NEWS_QUICK_MODE === "true";

export async function POST(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "AI News cron is not configured" }, { status: 503 });
  }
  if (!hasBearerToken(request.headers.get("authorization"), CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  let processed = 0;
  let failed = 0;

  try {
    console.log("[AI News] Starting discussion cycle...");

    const newsItems = await getTopNews(MAX_NEWS_ITEMS);
    if (newsItems.length === 0) {
      console.log("[AI News] No relevant news found");
      return NextResponse.json({ processed: 0, message: "No relevant news found" });
    }

    console.log(`[AI News] Found ${newsItems.length} news items, running discussion...`);

    const session = QUICK_MODE
      ? await runQuickDiscussion(newsItems)
      : await runDiscussionSession(newsItems);

    await saveDiscussionSession(session);
    processed = 1;

    console.log(`[AI News] Discussion completed: ${session.id}`);

    await deleteOldDiscussions(30);

    return NextResponse.json({
      processed,
      failed,
      sessionId: session.id,
      newsCount: newsItems.length,
      durationMs: Date.now() - startTime,
      summary: session.summary,
    });
  } catch (error) {
    failed = 1;
    console.error("[AI News] Discussion cycle failed:", error);
    return NextResponse.json(
      { error: "Discussion cycle failed", processed, failed, durationMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (!action) {
    return NextResponse.json({
      ok: true,
      message: "AI News Discussion Cron Endpoint",
      config: {
        intervalHours: DISCUSSION_INTERVAL_HOURS,
        maxNewsItems: MAX_NEWS_ITEMS,
        quickMode: QUICK_MODE,
      },
    });
  }

  if (!CRON_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (!hasBearerToken(request.headers.get("authorization"), CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  switch (action) {
    case "test":
      return NextResponse.json({ ok: true, message: "Cron endpoint is reachable" });
    case "run-now":
      return POST(request);
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}