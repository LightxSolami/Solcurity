import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPublicIpv4(address: string): boolean {
  const [first, second, third] = address.split(".").map(Number);
  if ([first, second, third].some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19 || second === 51)) ||
    (first === 203 && second === 0 && third === 113)
  );
}

function isPublicIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version !== 6) return false;

  const firstSegment = Number.parseInt(address.split(":")[0] || "0", 16);
  const normalized = address.toLowerCase();
  return firstSegment >= 0x2000 &&
    firstSegment <= 0x3fff &&
    !normalized.startsWith("2001:0:") &&
    !normalized.startsWith("2001:db8:") &&
    !normalized.startsWith("2002:");
}

export async function validatePublicRpcUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid RPC URL");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("RPC endpoints must use HTTPS and cannot include credentials");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error("RPC endpoint must resolve only to public IP addresses");
  }

  return url;
}
