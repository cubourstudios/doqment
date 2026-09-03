/**
 * Rate limiting.
 *
 * In-process and per-instance, which is a real limitation worth stating: on
 * Vercel each serverless instance keeps its own counter, so the effective limit
 * is the configured one multiplied by however many instances are warm. That
 * makes this useless against a distributed attack and genuinely useful against
 * the things that actually happen to a small product — a runaway retry loop, a
 * script hammering signup, someone holding down a button.
 *
 * Moving to Upstash or Supabase-backed counters is the upgrade when it is
 * needed. Doing it now would add a network round trip to every request to solve
 * a problem this product does not yet have.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Bound the map so a flood of unique keys cannot grow it without limit. */
const MAX_BUCKETS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) evictExpired(now);

    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

function evictExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  // Still full of live buckets: drop the oldest rather than refuse to record
  // anything new, which would disable the limiter exactly when it is needed.
  if (buckets.size >= MAX_BUCKETS) {
    const oldest = [...buckets.entries()]
      .sort((a, b) => a[1].resetAt - b[1].resetAt)
      .slice(0, Math.floor(MAX_BUCKETS / 4));

    for (const [key] of oldest) buckets.delete(key);
  }
}

/**
 * Identify the caller.
 *
 * x-forwarded-for is set by Vercel's proxy and can be spoofed when the app is
 * reached directly, so this is a heuristic for throttling, never for
 * authorisation. The leftmost entry is the client as the first trusted proxy
 * saw it.
 */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${scope}:${ip}`;
}

export const LIMITS = {
  /** Signup and password reset: expensive for us, and email is a spam vector. */
  auth: { limit: 10, windowSeconds: 600 },
  /** Document generation, which does real database work. */
  generate: { limit: 30, windowSeconds: 600 },
  /** Uploads. */
  upload: { limit: 20, windowSeconds: 600 },
} as const;
