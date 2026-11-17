const FALLBACK_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana.drpc.org",
  "https://rpc.ankr.com/solana",
  "https://solana-mainnet.g.alchemy.com/v2/demo",
];

export function sanitizeRpcUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes("YOUR_HELIUS_KEY") || trimmed.includes("YOUR_KEY")) {
    return null;
  }
  return trimmed;
}

export function buildFreeRpcEndpoints(): string[] {
  const endpoints = new Set<string>();
  const configured = sanitizeRpcUrl(process.env.SOLANARPCURL);
  if (configured) endpoints.add(configured);

  for (const endpoint of FALLBACK_RPC_ENDPOINTS) {
    endpoints.add(endpoint);
  }

  return Array.from(endpoints);
}
