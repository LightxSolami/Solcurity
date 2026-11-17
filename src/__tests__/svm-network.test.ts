import { DEFAULT_SVM_RPC_URL, getSvmNetworkLabel } from "@/lib/svm-network";

describe("getSvmNetworkLabel", () => {
  it("defaults the explorer to Mainnet", () => {
    expect(getSvmNetworkLabel(DEFAULT_SVM_RPC_URL)).toBe("Mainnet");
  });

  it.each([
    ["http://127.0.0.1:8899", "Local Validator"],
    ["https://api.devnet.solana.com", "Devnet"],
    ["https://api.testnet.solana.com", "Testnet"],
    ["https://api.mainnet-beta.solana.com", "Mainnet"],
    ["https://custom-rpc.example", "Custom RPC (network unverified)"],
  ] as const)("labels %s as %s", (rpcUrl, expected) => {
    expect(getSvmNetworkLabel(rpcUrl)).toBe(expected);
  });
});
