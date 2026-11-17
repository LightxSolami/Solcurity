export interface PumpFunTokenLink {
  mint: string;
  url: string;
}

export function getPumpFunTokenLink(value: string | undefined): PumpFunTokenLink | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    const match = url.pathname.match(/^\/coin\/([1-9A-HJ-NP-Za-km-z]{32,44})\/?$/);
    if (
      url.protocol !== "https:" ||
      !["pump.fun", "www.pump.fun"].includes(url.hostname) ||
      url.username ||
      url.password ||
      !match
    ) {
      return null;
    }

    return {
      mint: match[1],
      url: `https://pump.fun/coin/${match[1]}`,
    };
  } catch {
    return null;
  }
}
