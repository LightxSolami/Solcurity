/** @jest-environment node */

jest.mock("@/lib/ai-news/clients", () => ({
  getAvailableClients: jest.fn(),
}));

import { getAvailableClients, type AIClient } from "@/lib/ai-news/clients";
import { runDiscussionSession } from "@/lib/ai-news/orchestrator";
import type { NewsItem } from "@/lib/ai-news/news-aggregator";

const getAvailableClientsMock = jest.mocked(getAvailableClients);

const newsItems: NewsItem[] = [{
  id: "solana-news-1",
  title: "Solana network update",
  summary: "A network update introduces changes for validators.",
  url: "https://example.com/solana-update",
  source: "Example News",
  publishedAt: "2026-11-20T12:00:00.000Z",
  category: "solana",
  tags: ["validator"],
  relevanceScore: 0.9,
}];

function provider(name: string, response: string | null): AIClient {
  return {
    name,
    available: true,
    complete: async () => response,
  };
}

describe("runDiscussionSession", () => {
  beforeEach(() => {
    getAvailableClientsMock.mockReset();
  });

  it("generates four persona messages and a summary from a configured provider", async () => {
    getAvailableClientsMock.mockReturnValue([provider("Groq", "A measured perspective.")]);

    const session = await runDiscussionSession(newsItems, 1);

    expect(session.rounds).toHaveLength(1);
    expect(session.rounds[0].messages).toHaveLength(4);
    expect(session.rounds[0].messages.every(message => message.provider === "Groq")).toBe(true);
    expect(session.summary).toBe("A measured perspective.");
    expect(new Date(session.completedAt!).getTime()).toBeGreaterThanOrEqual(
      new Date(session.startedAt).getTime()
    );
  });

  it("falls back across configured providers instead of saving placeholder replies", async () => {
    getAvailableClientsMock.mockReturnValue([
      provider("Groq", null),
      provider("Gemini", "Fallback perspective."),
    ]);

    const session = await runDiscussionSession(newsItems, 1);

    expect(session.rounds[0].messages.every(message => message.provider === "Gemini")).toBe(true);
    expect(session.rounds[0].messages.every(message => message.content === "Fallback perspective.")).toBe(true);
    expect(session.summary).toBe("Fallback perspective.");
  });

  it("fails explicitly when no provider is configured", async () => {
    getAvailableClientsMock.mockReturnValue([]);

    await expect(runDiscussionSession(newsItems, 1))
      .rejects.toThrow("Configure at least one AI provider");
  });
});
