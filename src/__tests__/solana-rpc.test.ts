import { getRpcEndpointHealth, withRpcRetry } from "@/lib/solana-rpc";

jest.mock("@solana/web3.js", () => ({
  Connection: class Connection {
    async getGenesisHash() {
      return "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
    }
  },
  PublicKey: class PublicKey {},
  LAMPORTS_PER_SOL: 1_000_000_000,
}));

describe("Solana RPC failover", () => {
  it("reports an outage instead of returning empty data", async () => {
    const operation = jest.fn().mockRejectedValue(new Error("provider unavailable"));

    await expect(withRpcRetry(operation, 0)).rejects.toThrow("RPC request failed");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(getRpcEndpointHealth().some((endpoint) => endpoint.consecutiveFailures > 0)).toBe(true);
  });

  it("retries the next configured endpoint after a failure", async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error("temporary provider failure"))
      .mockResolvedValueOnce("confirmed");

    await expect(withRpcRetry(operation, 1)).resolves.toBe("confirmed");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
