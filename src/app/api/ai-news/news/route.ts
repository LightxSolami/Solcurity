import { NextRequest, NextResponse } from "next/server";
import { fetchAllNews, getTopNews, getNewsByCategory } from "@/lib/ai-news/news-aggregator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const category = searchParams.get("category");

  try {
    if (action === "top") {
      const news = await getTopNews(limit);
      return NextResponse.json({ news });
    }

    if (category) {
      const news = await getNewsByCategory(category as any, limit);
      return NextResponse.json({ news });
    }

    const news = await fetchAllNews();
    return NextResponse.json({ news: news.slice(0, limit) });
  } catch (error) {
    console.error("Failed to fetch news:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}