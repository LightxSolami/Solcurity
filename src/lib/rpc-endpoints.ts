const FALLBACK_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana.drpc.org",
  "https://rpc.ankr.com/solana",
  "https://solana-mainnet.g.alchemy.com/v2/demo",
  "https://solana-rpc.publicnode.com",
];

export function sanitizeRpcUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes("YOUR_HELIUS_KEY") || trimmed.includes("YOUR_KEY")) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.username ||
      parsed.password ||
      (parsed.protocol !== "https:" &&
        !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname)))
    ) {
      return null;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function buildFreeRpcEndpoints(): string[] {
  const endpoints = new Set<string>();
  const configured = [
    ...(process.env.SOLANARPCURLS || "").split(/[\s,;]+/),
    process.env.SOLANARPCURL || "",
  ];
  for (const candidate of configured) {
    const endpoint = sanitizeRpcUrl(candidate);
    if (endpoint) endpoints.add(endpoint);
  }

  for (const endpoint of FALLBACK_RPC_ENDPOINTS) {
    endpoints.add(endpoint);
  }

  return Array.from(endpoints);
}

export function isConfiguredRpcUrl(url: string): boolean {
  const normalized = sanitizeRpcUrl(url);
  return normalized !== null && buildFreeRpcEndpoints().includes(normalized);
}
