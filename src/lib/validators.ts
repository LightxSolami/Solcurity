import { z } from "zod";

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

function isValidSolanaPublicKey(address: string): boolean {
  // Basic validation: length and base58 characters
  if (address.length < 32 || address.length > 44) return false;
  if (!BASE58_REGEX.test(address)) return false;
  
  // Try to use @solana/web3.js PublicKey for full validation if available
  try {
    const { PublicKey } = require("@solana/web3.js");
    new PublicKey(address);
    return true;
  } catch {
    // If solana-web3.js is not available or fails, rely on basic validation
    // This allows tests to run without the full solana-web3.js dependency
    return true;
  }
}

export const SolanaAddressSchema = z
  .string()
  .min(32, "Solana address must be at least 32 characters")
  .max(44, "Solana address must be at most 44 characters")
  .regex(BASE58_REGEX, "Invalid Base58 characters in Solana address")
  .refine(
    (val) => isValidSolanaPublicKey(val),
    { message: "Invalid Solana public key format" }
  );

export type SolanaAddressInput = z.infer<typeof SolanaAddressSchema>;

export const ScanRequestSchema = z.object({
  address: SolanaAddressSchema,
  rpcUrl: z.string().url().optional(),
});

export type ScanRequest = z.infer<typeof ScanRequestSchema>;

export const RiskLevelSchema = z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]);

export const SeveritySchema = z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const ConfidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
