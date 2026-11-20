/** @jest-environment node */

jest.mock("@/lib/groq", () => ({
  groq: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/scan/explain/route";
import { groq } from "@/lib/groq";

const validRequest = {
  riskLevel: "HIGH",
  score: 72,
  scanConfidence: 85,
  partialScan: true,
  checks: [{ label: "Threat intelligence", status: "UNKNOWN" }],
  findings: [{
    severity: "HIGH",
    title: "Active authority",
    description: "A token has an active mint authority.",
    evidence: "Mint authority is present.",
    confidence: "HIGH",
    recommendation: "Review the mint authority.",
  }],
};

function request(body: unknown, ip: string) {
  return new NextRequest("https://solcurity.test/api/scan/explain", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/scan/explain", () => {
  const createCompletion = groq.chat.completions.create as jest.Mock;
  const originalApiKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    process.env.GROQ_API_KEY = "test-api-key";
    createCompletion.mockReset();
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalApiKey;
  });

  it("uses the configured Qwen model and returns the explanation", async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: "Key takeaways\nThe scan is incomplete." } }],
    });

    const response = await POST(request(validRequest, "192.0.2.10"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      explanation: "Key takeaways\nThe scan is incomplete.",
      model: "qwen/qwen3.8-27b",
    });
    expect(createCompletion).toHaveBeenCalledWith(expect.objectContaining({
      model: "qwen/qwen3.8-27b",
    }));
  });

  it("rejects malformed scan summaries without calling the model", async () => {
    const response = await POST(request({ ...validRequest, findings: Array(9).fill(validRequest.findings[0]) }, "192.0.2.11"));

    expect(response.status).toBe(400);
    expect(createCompletion).not.toHaveBeenCalled();
  });
});
