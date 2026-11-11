import { decodeTransactionData } from "@/lib/transaction-decoder";
import {
  lamportsToSol,
  solToLamports,
} from "@/components/tools/LamportsConverter";
import { validatePublicRpcUrl } from "@/lib/public-rpc-url";

describe("Lamports converter", () => {
  it("converts SOL to lamports without floating-point rounding", () => {
    expect(solToLamports("1.000000001")).toBe("1000000001");
    expect(solToLamports("0.000000001")).toBe("1");
    expect(solToLamports("")).toBe("");
  });

  it("converts lamports to SOL exactly", () => {
    expect(lamportsToSol("1000000001")).toBe("1.000000001");
    expect(lamportsToSol("100000000000000000")).toBe("100000000");
    expect(lamportsToSol("")).toBe("");
  });

  it("rejects fractional lamports and SOL precision beyond 9 decimal places", () => {
    expect(lamportsToSol("1.5")).toBe("");
    expect(solToLamports("0.0000000001")).toBe("");
  });
});

describe("Transaction data decoder", () => {
  it("decodes hexadecimal data with or without a prefix", () => {
    expect(decodeTransactionData("01020304").decodedHex).toBe("01020304");
    expect(decodeTransactionData("0x01020304").decodedHex).toBe("01020304");
  });

  it("decodes base64 data", () => {
    expect(decodeTransactionData("AQIDBA==")).toMatchObject({
      length: 4,
      bytes: [1, 2, 3, 4],
      decodedHex: "01020304",
    });
  });

  describe("RPC URL validation", () => {
    it("allows a public HTTPS RPC endpoint", async () => {
      await expect(validatePublicRpcUrl("https://8.8.8.8")).resolves.toBeInstanceOf(URL);
    });

    it("rejects insecure, credentialed, and private RPC endpoints", async () => {
      await expect(validatePublicRpcUrl("http://8.8.8.8")).rejects.toThrow("HTTPS");
      await expect(validatePublicRpcUrl("https://user:pass@8.8.8.8")).rejects.toThrow("credentials");
      await expect(validatePublicRpcUrl("https://127.0.0.1")).rejects.toThrow("public IP");
      await expect(validatePublicRpcUrl("https://localhost")).rejects.toThrow("public IP");
      await expect(validatePublicRpcUrl("https://[::1]")).rejects.toThrow("public IP");
      await expect(validatePublicRpcUrl("https://[2002:7f00:1::1]")).rejects.toThrow("public IP");
    });
  });

  it("rejects malformed or empty data", () => {
    expect(() => decodeTransactionData("")).toThrow("Please enter transaction data");
    expect(() => decodeTransactionData("0x")).toThrow("valid hexadecimal");
    expect(() => decodeTransactionData("not base64!")).toThrow("valid hexadecimal");
  });
});
