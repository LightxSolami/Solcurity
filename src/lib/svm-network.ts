export const DEFAULT_SVM_RPC_URL = "https://api.mainnet-beta.solana.com";

export type SvmNetworkLabel =
  | "Local Validator"
  | "Devnet"
  | "Testnet"
  | "Mainnet"
  | "Custom RPC (network unverified)";

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
