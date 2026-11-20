import { NextRequest, NextResponse } from "next/server";
import { fetchAllNews, getTopNews, getNewsByCategory } from "@/lib/ai-news/news-aggregator";
import type { NewsItem } from "@/lib/ai-news/news-aggregator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEWS_CATEGORIES: NewsItem["category"][] = [
  "solana", "defi", "nft", "infrastructure", "regulation", "market", "security", "general",
];

function isNewsCategory(category: string): category is NewsItem["category"] {
  return NEWS_CATEGORIES.some(candidate => candidate === category);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const requestedLimit = Number(searchParams.get("limit") || "20");
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : 20;
  const category = searchParams.get("category");

  try {
    if (action === "top") {
      const news = await getTopNews(limit);
      return NextResponse.json({ news });
    }

    if (category) {
      if (!isNewsCategory(category)) {
        return NextResponse.json({ error: "Invalid news category" }, { status: 400 });
      }
      const news = await getNewsByCategory(category, limit);
      return NextResponse.json({ news });
    }

    const news = await fetchAllNews();
    return NextResponse.json({ news: news.slice(0, limit) });
  } catch (error) {
    console.error("Failed to fetch news:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}