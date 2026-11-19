/** @jest-environment node */

jest.mock("@/lib/telegram/bot", () => ({
  BOT_TOKEN: "test-bot-token",
  WEBHOOK_URL: "https://solcurity.test",
}));

jest.mock("@/lib/telegram/handler", () => ({
  bot: { processUpdate: jest.fn() },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/telegram/webhook/route";

const processUpdate = jest.requireMock("@/lib/telegram/handler").bot.processUpdate as jest.Mock;

function request(
  method: "GET" | "POST",
  url: string,
  headers: Record<string, string> = {},
  body?: string,
): NextRequest {
  return new NextRequest(url, {
    method,
    headers,
    body,
  });
}

describe("Telegram webhook route", () => {
  const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const originalAdminToken = process.env.TELEGRAM_WEBHOOK_ADMIN_TOKEN;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret";
    process.env.TELEGRAM_WEBHOOK_ADMIN_TOKEN = "test-admin-token";
    processUpdate.mockReset().mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
    if (originalAdminToken === undefined) delete process.env.TELEGRAM_WEBHOOK_ADMIN_TOKEN;
    else process.env.TELEGRAM_WEBHOOK_ADMIN_TOKEN = originalAdminToken;
    global.fetch = originalFetch;
  });

  it("rejects webhook requests without Telegram's secret header", async () => {
    const response = await POST(request("POST", "https://solcurity.test/api/telegram/webhook", {}, JSON.stringify({ update_id: 1 })));

    expect(response.status).toBe(401);
    expect(processUpdate).not.toHaveBeenCalled();
  });

  it("accepts update ID zero after validating the Telegram secret", async () => {
    const response = await POST(request(
      "POST",
      "https://solcurity.test/api/telegram/webhook",
      { "x-telegram-bot-api-secret-token": "test-webhook-secret" },
      JSON.stringify({ update_id: 0 }),
    ));

    expect(response.status).toBe(200);
    expect(processUpdate).toHaveBeenCalledWith({ update_id: 0 });
  });

  it("rejects webhook administration without a bearer token", async () => {
    const response = await GET(request("GET", "https://solcurity.test/api/telegram/webhook?action=info"));

    expect(response.status).toBe(401);
  });

  it("sets the webhook secret only through the protected admin action", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    global.fetch = fetchMock;

    const response = await GET(request(
      "GET",
      "https://solcurity.test/api/telegram/webhook?action=set",
      { authorization: "Bearer test-admin-token" },
    ));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-bot-token/setWebhook",
      expect.objectContaining({
        body: expect.stringContaining('"secret_token":"test-webhook-secret"'),
      }),
    );
  });
});
