import { LRUCache } from "lru-cache";
import { ScanResult } from "@/lib/types";

type ScanCache = LRUCache<string, ScanResult>;

let scanCache: ScanCache | null = null;

export function getScanCache(): ScanCache {
  if (!scanCache) {
    const ttlSeconds = parseInt(process.env.CACHE_TTL_SECONDS || "300", 10);
    scanCache = new LRUCache<string, ScanResult>({
      max: 500,
      ttl: ttlSeconds * 1000,
    });
  }
  return scanCache;
}

export function getCachedScan(address: string): ScanResult | undefined {
  return getScanCache().get(address);
}

export function setCachedScan(address: string, result: ScanResult): void {
  getScanCache().set(address, result);
}

export function clearScanCache(): void {
  getScanCache().clear();
}
