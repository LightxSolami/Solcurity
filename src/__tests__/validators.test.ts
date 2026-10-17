import { SolanaAddressSchema, ScanRequestSchema } from "@/lib/validators";

describe("Validators", () => {
  describe("SolanaAddressSchema", () => {
    const validAddresses = [
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "11111111111111111111111111111111",
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    ];

    const invalidAddresses = [
      "",
      "not-a-valid-address",
      "0x1234567890abcdef",
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWMx", // too long (45)
      "1234567890123456789012345678901", // 31 chars - too short
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWW0", // invalid base58 (0)
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWI", // invalid base58 (I)
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWO", // invalid base58 (O)
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWI", // invalid base58 (l)
    ];

    test.each(validAddresses)("accepts valid address: %s", (address) => {
      const result = SolanaAddressSchema.safeParse(address);
      expect(result.success).toBe(true);
    });

    test.each(invalidAddresses)("rejects invalid address: %s", (address) => {
      const result = SolanaAddressSchema.safeParse(address);
      expect(result.success).toBe(false);
    });
  });

  describe("ScanRequestSchema", () => {
    it("accepts valid request", () => {
      const result = ScanRequestSchema.safeParse({
        address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing address", () => {
      const result = ScanRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects invalid address", () => {
      const result = ScanRequestSchema.safeParse({
        address: "not-valid",
      });
      expect(result.success).toBe(false);
    });
  });
});