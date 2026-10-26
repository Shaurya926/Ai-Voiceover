// Basic in-memory throttling. This is per server instance: on Vercel each warm
// serverless instance keeps its own counters, so treat it as a courtesy guard
// against accidental hammering, not as a hard quota. For strict global limits,
// move these counters to a shared store (e.g. Upstash Redis / Vercel KV).

function intEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const hits = new Map<string, number[]>();
let active = 0;

export type RateResult = { ok: true } | { ok: false; retryAfter: number };

export function checkRate(key: string, now = Date.now()): RateResult {
  const perMinute = intEnv("RATE_LIMIT_PER_MINUTE", 6);
  const perHour = intEnv("RATE_LIMIT_PER_HOUR", 40);

  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 3_600_000) hits.delete(k);
  }

  const list = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  const lastMinute = list.filter((t) => now - t < 60_000);

  if (lastMinute.length >= perMinute) {
    const retryAfter = Math.max(1, Math.ceil((lastMinute[0] + 60_000 - now) / 1000));
    hits.set(key, list);
    return { ok: false, retryAfter };
  }
  if (list.length >= perHour) {
    const retryAfter = Math.max(1, Math.ceil((list[0] + 3_600_000 - now) / 1000));
    hits.set(key, list);
    return { ok: false, retryAfter };
  }

  list.push(now);
  hits.set(key, list);
  return { ok: true };
}

export function acquireSlot(): boolean {
  if (active >= intEnv("MAX_CONCURRENT_GENERATIONS", 4)) return false;
  active += 1;
  return true;
}

export function releaseSlot(): void {
  active = Math.max(0, active - 1);
}

export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip") || "unknown";
}
