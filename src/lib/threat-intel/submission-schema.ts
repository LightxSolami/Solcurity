import { z } from "zod";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const NETWORKS = ["solana-mainnet", "solana-devnet", "solana-testnet"] as const;
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ENTITY_TYPES = ["wallet", "token_mint", "program", "transaction_signature"] as const;
const CATEGORIES = [
  "malicious_wallet",
  "scam_token",
  "malicious_program",
  "drainer",
  "phishing",
  "suspicious_funding",
  "other",
] as const;
const CATEGORIES_BY_ENTITY: Record<(typeof ENTITY_TYPES)[number], readonly string[]> = {
  wallet: ["malicious_wallet", "drainer", "phishing", "other"],
  token_mint: ["scam_token", "phishing", "other"],
  program: ["malicious_program", "drainer", "phishing", "other"],
  transaction_signature: ["suspicious_funding", "phishing", "other"],
};

function isPublicKey(value: string): boolean {
  return value.length >= 32 && value.length <= 44 &&
    BASE58.test(value) && base58DecodedLength(value) === 32;
}

export function isValidSolanaTransactionSignature(value: string): boolean {
  return value.length > 0 && value.length <= 88 &&
    BASE58.test(value) && base58DecodedLength(value) === 64;
}

export function isValidHttpsEvidenceUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function base58DecodedLength(value: string): number | null {
  const leadingZeroes = value.match(/^1*/)?.[0].length ?? 0;
  const bytes = [0];
  for (const character of value) {
    const digit = BASE58_ALPHABET.indexOf(character);
    if (digit < 0) return null;
    let carry = digit;
    for (let index = bytes.length - 1; index >= 0; index -= 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.unshift(carry & 0xff);
      carry >>= 8;
    }
  }
  const significantBytes = bytes.length === 1 && bytes[0] === 0 ? 0 : bytes.length;
  return significantBytes + leadingZeroes;
}

export const CommunitySubmissionSchema = z.object({
  network: z.enum(NETWORKS),
  entityType: z.enum(ENTITY_TYPES),
  identifier: z.string().trim().min(1).max(128),
  category: z.enum(CATEGORIES),
  evidenceKind: z.enum(["url", "transaction_signature"]),
  evidenceValue: z.string().trim().min(1).max(2048),
  explanation: z.string().trim().min(20).max(4000),
}).superRefine((submission, context) => {
  if (!CATEGORIES_BY_ENTITY[submission.entityType].includes(submission.category)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["category"],
      message: "The selected category does not match this entity type.",
    });
  }

  const isSignatureEntity = submission.entityType === "transaction_signature";
  const identifierIsValid = isSignatureEntity
    ? isValidSolanaTransactionSignature(submission.identifier)
    : isPublicKey(submission.identifier);

  if (!identifierIsValid) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["identifier"],
      message: isSignatureEntity
        ? "Enter a valid Base58 Solana transaction signature."
        : "Enter a valid Solana address, mint, or program ID.",
    });
  }

  if (submission.evidenceKind === "transaction_signature") {
    if (!isValidSolanaTransactionSignature(submission.evidenceValue)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceValue"],
        message: "Evidence must be a valid Base58 Solana transaction signature.",
      });
    }
  } else {
    if (!isValidHttpsEvidenceUrl(submission.evidenceValue)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceValue"],
        message: "Evidence links must be valid HTTPS URLs.",
      });
    }
  }
});

export const ModeratorDecisionSchema = z.object({
  submissionId: z.string().uuid(),
  action: z.enum(["approved", "rejected", "marked_duplicate"]),
  notes: z.string().trim().min(10).max(4000),
  sourceId: z.string().uuid().optional(),
  status: z.enum(["confirmed", "suspected"]).optional(),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
}).superRefine((decision, context) => {
  if (decision.action === "approved") {
    if (!decision.sourceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceId"],
        message: "Select an approved intelligence source before approval.",
      });
    }
    if (!decision.status || !decision.confidence || !decision.expiresAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "Approval requires a status, confidence and expiry date.",
      });
    }
  }
});

export type CommunitySubmissionInput = z.infer<typeof CommunitySubmissionSchema>;
export type ModeratorDecisionInput = z.infer<typeof ModeratorDecisionSchema>;
