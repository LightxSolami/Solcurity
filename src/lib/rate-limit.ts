interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private entries: Map<string, RateLimitEntry> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now > entry.resetAt) {
      this.entries.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  cleanup(): void {
    const now = Date.now();
    const entriesArray = Array.from(this.entries.entries());
    for (const [key, entry] of entriesArray) {
      if (now > entry.resetAt) {
        this.entries.delete(key);
      }
    }
  }
}

export function getRateLimiter() {
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10", 10);
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || "60", 10) * 1000;
  return new RateLimiter(maxRequests, windowMs);
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for") ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
