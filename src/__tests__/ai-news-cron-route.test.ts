/** @jest-environment node */

jest.mock("@/lib/ai-news/news-aggregator", () => ({
  getTopNews: jest.fn(),
}));
jest.mock("@/lib/ai-news/orchestrator", () => ({
  runDiscussionSession: jest.fn(),
  runQuickDiscussion: jest.fn(),
}));
jest.mock("@/lib/ai-news/discussion-repository", () => ({
  saveDiscussionSession: jest.fn(),
  deleteOldDiscussions: jest.fn(),
}));

import { NextRequest } from "next/server";

const originalSecrets = {
  cron: process.env.CRON_SECRET,
  aiNews: process.env.AI_NEWS_CRON_SECRET,
  telegram: process.env.TELEGRAM_CRON_SECRET,
  quickMode: process.env.AI_NEWS_QUICK_MODE,
};
process.env.CRON_SECRET = "test-ai-news-vercel-cron-secret";
delete process.env.AI_NEWS_CRON_SECRET;
delete process.env.TELEGRAM_CRON_SECRET;
process.env.AI_NEWS_QUICK_MODE = "false";

const { GET } = require("@/app/api/ai-news/discuss/route") as typeof import("@/app/api/ai-news/discuss/route");
const cronSecret = "test-ai-news-vercel-cron-secret";

function request(authorization?: string, action: string | null = "test"): NextRequest {
  const url = action
    ? `https://solcurity.test/api/ai-news/discuss?action=${action}`
    : "https://solcurity.test/api/ai-news/discuss";
  return new NextRequest(url, {
    headers: authorization ? { authorization } : {},
  });
}

describe("GET /api/ai-news/discuss", () => {
  afterAll(() => {
    if (originalSecrets.cron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecrets.cron;
    if (originalSecrets.aiNews === undefined) delete process.env.AI_NEWS_CRON_SECRET;
    else process.env.AI_NEWS_CRON_SECRET = originalSecrets.aiNews;
    if (originalSecrets.telegram === undefined) delete process.env.TELEGRAM_CRON_SECRET;
    else process.env.TELEGRAM_CRON_SECRET = originalSecrets.telegram;
    if (originalSecrets.quickMode === undefined) delete process.env.AI_NEWS_QUICK_MODE;
    else process.env.AI_NEWS_QUICK_MODE = originalSecrets.quickMode;
  });

  it("accepts the Authorization bearer token sent by Vercel Cron", async () => {
    const response = await GET(request(`Bearer ${cronSecret}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });

  it("rejects requests without the configured cron secret", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("runs a debate when Vercel Cron calls the route without a query string", async () => {
    const newsItems = [{
      id: "solana-news-1",
      title: "Solana network update",
      summary: "A network update for validators.",
      url: "https://example.com/solana-update",
      source: "Example News",
      publishedAt: "2026-11-20T12:00:00.000Z",
      category: "solana",
      tags: [],
      relevanceScore: 0.9,
    }];
    const session = {
      id: "discussion-1",
      newsItems,
      rounds: [],
      startedAt: "2026-11-20T12:00:00.000Z",
      completedAt: "2026-11-20T12:01:00.000Z",
      summary: "A summary.",
    };
    const news = jest.requireMock("@/lib/ai-news/news-aggregator");
    const orchestrator = jest.requireMock("@/lib/ai-news/orchestrator");
    const repository = jest.requireMock("@/lib/ai-news/discussion-repository");
    news.getTopNews.mockResolvedValue(newsItems);
    orchestrator.runDiscussionSession.mockResolvedValue(session);
    repository.saveDiscussionSession.mockResolvedValue(undefined);
    repository.deleteOldDiscussions.mockResolvedValue(0);

    const response = await GET(request(`Bearer ${cronSecret}`, null));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ processed: 1, sessionId: "discussion-1" });
    expect(orchestrator.runDiscussionSession).toHaveBeenCalledWith(newsItems);
  });
});
