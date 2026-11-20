/** @jest-environment node */

jest.mock("@/lib/ai-news/discussion-repository", () => ({
  getDiscussionSession: jest.fn(),
  getLatestDiscussion: jest.fn(),
  getRecentDiscussions: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/ai-news/discussions/route";

const repository = jest.requireMock("@/lib/ai-news/discussion-repository");

function request(query: string): NextRequest {
  return new NextRequest(`https://solcurity.test/api/ai-news/discussions${query}`);
}

describe("GET /api/ai-news/discussions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("retrieves a discussion by id", async () => {
    const discussion = {
      id: "discussion-1",
      newsItems: [],
      rounds: [],
      startedAt: "2026-11-20T12:00:00.000Z",
    };
    repository.getDiscussionSession.mockResolvedValue(discussion);

    const response = await GET(request("?id=discussion-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ discussion });
    expect(repository.getDiscussionSession).toHaveBeenCalledWith("discussion-1");
  });

  it("bounds the requested history limit", async () => {
    repository.getRecentDiscussions.mockResolvedValue([]);

    const response = await GET(request("?limit=1000"));

    expect(response.status).toBe(200);
    expect(repository.getRecentDiscussions).toHaveBeenCalledWith(50);
  });

  it("reports missing Supabase setup as a service-unavailable response", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    repository.getDiscussionSession.mockRejectedValue(
      new Error("Discussion storage is not configured.")
    );

    const response = await GET(request("?id=discussion-1"));

    expect(response.status).toBe(503);
  });
});
