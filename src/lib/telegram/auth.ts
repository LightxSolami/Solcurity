import { timingSafeEqual } from "node:crypto";

export function secureEquals(expected: string, actual: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

export function hasBearerToken(authorization: string | null, expected: string | undefined): boolean {
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  return secureEquals(expected, authorization.slice(7));
}
