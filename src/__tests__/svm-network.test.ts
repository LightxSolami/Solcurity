import {
  DEFAULT_SVM_RPC_URL,
  getSvmNetworkLabel,
  getSvmRpcCandidates,
  isSupportedSvmRpcUrl,
  SVM_GENESIS_HASHES,
} from "@/lib/svm-network";

describe("SVM genesis hashes", () => {
  it("uses the complete Solana Mainnet genesis hash", () => {
    expect(SVM_GENESIS_HASHES.Mainnet).toBe(
      "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
    );
  });
});

describe("getSvmNetworkLabel", () => {
  it("defaults the explorer to the Official Mainnet Beta RPC", () => {
    expect(DEFAULT_SVM_RPC_URL).toBe("https://api.mainnet-beta.solana.com");
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

  it("only falls back to endpoints on the selected network", () => {
    expect(getSvmRpcCandidates(DEFAULT_SVM_RPC_URL).every((url) =>
      getSvmNetworkLabel(url) === "Mainnet"
    )).toBe(true);
    expect(getSvmRpcCandidates("https://api.devnet.solana.com")).toEqual([
      "https://api.devnet.solana.com",
    ]);
    expect(getSvmRpcCandidates("http://127.0.0.1:8899")).toEqual([
      "http://127.0.0.1:8899",
    ]);
  });

  it("rejects arbitrary RPC URLs", () => {
    expect(isSupportedSvmRpcUrl(DEFAULT_SVM_RPC_URL)).toBe(true);
    expect(isSupportedSvmRpcUrl("https://attacker.example/rpc")).toBe(false);
  });
});
