import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readSupabaseConfig, requireSupabaseConfig } from "./env";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

describe("supabase config", () => {
  const saved = { url: process.env[URL_KEY], anon: process.env[ANON_KEY] };

  beforeEach(() => {
    delete process.env[URL_KEY];
    delete process.env[ANON_KEY];
  });

  afterEach(() => {
    if (saved.url) process.env[URL_KEY] = saved.url;
    else delete process.env[URL_KEY];
    if (saved.anon) process.env[ANON_KEY] = saved.anon;
    else delete process.env[ANON_KEY];
  });

  it("reads both values when set", () => {
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env[ANON_KEY] = "anon-key";

    expect(readSupabaseConfig()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("returns null rather than throwing when nothing is set", () => {
    expect(readSupabaseConfig()).toBeNull();
  });

  /*
   * Half-configured is the realistic mistake — someone adds one variable and
   * misses the other — and it must not read as configured, or middleware would
   * hand a blank key to createServerClient.
   */
  it("treats a half-configured environment as unconfigured", () => {
    process.env[URL_KEY] = "https://example.supabase.co";
    expect(readSupabaseConfig()).toBeNull();
  });

  it("treats an empty string as unset", () => {
    process.env[URL_KEY] = "";
    process.env[ANON_KEY] = "anon-key";
    expect(readSupabaseConfig()).toBeNull();
  });

  // The point of the error is that a deployment log names the variable to fix.
  it("names both missing variables", () => {
    expect(() => requireSupabaseConfig()).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set/,
    );
  });

  it("names only the one that is missing", () => {
    process.env[URL_KEY] = "https://example.supabase.co";

    expect(() => requireSupabaseConfig()).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY is not set/,
    );
    expect(() => requireSupabaseConfig()).not.toThrow(/URL and/);
  });

  it("returns the config when set", () => {
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env[ANON_KEY] = "anon-key";

    expect(requireSupabaseConfig().url).toBe("https://example.supabase.co");
  });
});
