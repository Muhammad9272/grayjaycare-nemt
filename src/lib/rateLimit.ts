type RateBucket = { count: number; resetsAt: number };

const globalForRateLimit = globalThis as unknown as { grayJayRateLimits?: Map<string, RateBucket> };
const buckets = globalForRateLimit.grayJayRateLimits ?? new Map<string, RateBucket>();

if (process.env.NODE_ENV !== "production") globalForRateLimit.grayJayRateLimits = buckets;

export function withinRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetsAt <= now) buckets.delete(bucketKey);
    }
    while (buckets.size > 10_000) {
      const oldest = buckets.keys().next().value;
      if (typeof oldest !== "string") break;
      buckets.delete(oldest);
    }
  }
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function requestIp(request: Request): string {
  const candidate = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return candidate.replace(/[^a-fA-F0-9:.[\]-]/g, "").slice(0, 64) || "unknown";
}
