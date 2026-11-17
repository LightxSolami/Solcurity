import { getPumpFunTokenLink } from "@/lib/pumpfun-token-link";

describe("getPumpFunTokenLink", () => {
  it("extracts a mint and returns a canonical Pump.fun URL", () => {
    const mint = "11111111111111111111111111111111";

    expect(getPumpFunTokenLink(`https://www.pump.fun/coin/${mint}?ref=launch`)).toEqual({
      mint,
      url: `https://pump.fun/coin/${mint}`,
    });
  });

  it.each([
    "https://pump.fun/",
    "https://example.com/coin/11111111111111111111111111111111",
    "http://pump.fun/coin/11111111111111111111111111111111",
    "https://pump.fun/coin/not-a-mint",
  ])("rejects an invalid or non-token launch URL: %s", (url) => {
    expect(getPumpFunTokenLink(url)).toBeNull();
  });
});
