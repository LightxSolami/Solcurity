import "server-only";
import { timingSafeEqual } from "crypto";

export type ModeratorAuthResult = "authorized" | "unconfigured" | "unauthorized";

export function verifyModeratorAuthorization(
  authorizationHeader: string | null
): ModeratorAuthResult {
  const expectedToken = process.env.THREAT_INTEL_MODERATOR_TOKEN;
  if (!expectedToken || expectedToken.length < 32) return "unconfigured";

  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  if (!match) return "unauthorized";

  const expected = Buffer.from(expectedToken);
  const provided = Buffer.from(match[1]);
  if (expected.length !== provided.length) return "unauthorized";
  return timingSafeEqual(expected, provided) ? "authorized" : "unauthorized";
}
