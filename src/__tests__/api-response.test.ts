import { readApiResponse } from "@/lib/api-response";

describe("readApiResponse", () => {
  it("reports HTTP status when an error response is not JSON", async () => {
    await expect(
      readApiResponse(
        {
          ok: false,
          status: 502,
          json: () => Promise.reject(new SyntaxError("Unexpected token")),
        },
        "Wallet activity unavailable."
      )
    ).rejects.toThrow("Wallet activity unavailable. (HTTP 502).");
  });

  it("preserves JSON API error messages", async () => {
    await expect(
      readApiResponse(
        {
          ok: false,
          status: 502,
          json: async () => ({ error: "RPC unavailable." }),
        },
        "Wallet activity unavailable."
      )
    ).rejects.toThrow("RPC unavailable.");
  });

  it("rejects a successful response with malformed JSON", async () => {
    await expect(
      readApiResponse(
        {
          ok: true,
          status: 200,
          json: () => Promise.reject(new SyntaxError("Unexpected token")),
        },
        "Wallet scan failed."
      )
    ).rejects.toThrow("Wallet scan failed. The server returned an invalid response.");
  });
});
