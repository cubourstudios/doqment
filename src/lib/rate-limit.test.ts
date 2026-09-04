import { beforeEach, describe, expect, it, vi } from "vitest";

import { clientKey, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // A distinct key per test keeps the module-level map from leaking state.
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  it("allows requests up to the limit", () => {
    const key = `allow-${Math.random()}`;

    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit(key, 3, 60).allowed).toBe(true);
    }
  });

  it("blocks the request past the limit", () => {
    const key = `block-${Math.random()}`;

    rateLimit(key, 2, 60);
    rateLimit(key, 2, 60);

    expect(rateLimit(key, 2, 60).allowed).toBe(false);
  });

  it("counts down the remaining allowance", () => {
    const key = `remaining-${Math.random()}`;

    expect(rateLimit(key, 3, 60).remaining).toBe(2);
    expect(rateLimit(key, 3, 60).remaining).toBe(1);
    expect(rateLimit(key, 3, 60).remaining).toBe(0);
  });

  it("reports how long to wait when blocked", () => {
    const key = `retry-${Math.random()}`;

    rateLimit(key, 1, 60);
    const blocked = rateLimit(key, 1, 60);

    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("starts a fresh window once the old one expires", () => {
    const key = `window-${Math.random()}`;

    rateLimit(key, 1, 60);
    expect(rateLimit(key, 1, 60).allowed).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(rateLimit(key, 1, 60).allowed).toBe(true);
  });

  it("keeps separate keys independent", () => {
    const a = `sep-a-${Math.random()}`;
    const b = `sep-b-${Math.random()}`;

    rateLimit(a, 1, 60);
    expect(rateLimit(a, 1, 60).allowed).toBe(false);
    expect(rateLimit(b, 1, 60).allowed).toBe(true);
  });
});

describe("clientKey", () => {
  it("takes the leftmost forwarded address", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1, 70.41.3.18" },
    });

    expect(clientKey(request, "auth")).toBe("auth:203.0.113.1");
  });

  it("falls back when the header is absent", () => {
    const request = new Request("https://example.com");
    expect(clientKey(request, "auth")).toBe("auth:unknown");
  });

  it("scopes keys so one limit does not consume another", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1" },
    });

    expect(clientKey(request, "auth")).not.toBe(clientKey(request, "upload"));
  });
});
