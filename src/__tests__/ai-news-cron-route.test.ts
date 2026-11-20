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
};
process.env.CRON_SECRET = "test-ai-news-vercel-cron-secret";
delete process.env.AI_NEWS_CRON_SECRET;
delete process.env.TELEGRAM_CRON_SECRET;

const { GET } = require("@/app/api/ai-news/discuss/route") as typeof import("@/app/api/ai-news/discuss/route");
const cronSecret = "test-ai-news-vercel-cron-secret";

function request(authorization?: string): NextRequest {
  return new NextRequest("https://solcurity.test/api/ai-news/discuss?action=test", {
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
});
