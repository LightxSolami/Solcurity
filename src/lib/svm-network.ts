export const DEFAULT_SVM_RPC_URL = "https://api.mainnet-beta.solana.com";
export const DEFAULT_LOCAL_RPC_URL = "http://127.0.0.1:8899";
export const SVM_GENESIS_HASHES = {
  Mainnet: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  Devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  Testnet: "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY",
} as const;

export type SvmNetworkLabel =
  | "Local Validator"
  | "Devnet"
  | "Testnet"
  | "Mainnet"
  | "Custom RPC (network unverified)";

export const SVM_RPC_OPTIONS = [
  { label: "Official Mainnet Beta", url: "https://api.mainnet-beta.solana.com", network: "Mainnet" },
  { label: "Alchemy Demo (recommended)", url: "https://solana-mainnet.g.alchemy.com/v2/demo", network: "Mainnet" },
  { label: "Ankr", url: "https://rpc.ankr.com/solana", network: "Mainnet" },
  { label: "DRPC", url: "https://solana.drpc.org", network: "Mainnet" },
  { label: "Extrnode", url: "https://solana-mainnet.rpc.extrnode.com", network: "Mainnet" },
  { label: "PublicNode", url: "https://solana-rpc.publicnode.com", network: "Mainnet" },
  { label: "Chainstack Labs", url: "https://solana-mainnet.chainstacklabs.com", network: "Mainnet" },
  { label: "Syndica Free", url: "https://solana.api.syndica.io/api-key/free/solana-mainnet", network: "Mainnet" },
  { label: "Devnet", url: "https://api.devnet.solana.com", network: "Devnet" },
  { label: "Testnet", url: "https://api.testnet.solana.com", network: "Testnet" },
  { label: "Local Validator", url: DEFAULT_LOCAL_RPC_URL, network: "Local Validator" },
] as const;

const MAINNET_RPC_MARKERS = [
  "mainnet",
  "rpc.ankr.com/solana",
  "solana.drpc.org",
  "solana-rpc.publicnode.com",
];

export function getSvmNetworkLabel(rpcUrl: string): SvmNetworkLabel {
  const normalizedUrl = rpcUrl.toLowerCase();

  if (normalizedUrl.includes("devnet")) return "Devnet";
  if (normalizedUrl.includes("testnet")) return "Testnet";
  if (
    normalizedUrl.includes("127.0.0.1") ||
    normalizedUrl.includes("localhost")
  ) {
    return "Local Validator";
  }
  if (MAINNET_RPC_MARKERS.some((marker) => normalizedUrl.includes(marker))) {
    return "Mainnet";
  }

  return "Custom RPC (network unverified)";
}

export function getSvmRpcCandidates(rpcUrl: string): string[] {
  const network = getSvmNetworkLabel(rpcUrl);
  if (network === "Custom RPC (network unverified)" || network === "Local Validator") {
    return [rpcUrl];
  }

  return [
    rpcUrl,
    ...SVM_RPC_OPTIONS
      .filter((endpoint) => endpoint.network === network && endpoint.url !== rpcUrl)
      .map((endpoint) => endpoint.url),
  ];
}

export function isSupportedSvmRpcUrl(
  rpcUrl: string,
  allowLocal = process.env.NODE_ENV !== "production"
): boolean {
  const endpoint = SVM_RPC_OPTIONS.find((option) => option.url === rpcUrl);
  return Boolean(endpoint && (endpoint.network !== "Local Validator" || allowLocal));
}
