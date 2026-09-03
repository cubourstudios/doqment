import { describe, expect, it } from "vitest";

// Plain .mjs helper shared with the setup script.
import {
  fillPassword,
  parseEnvFile,
  preview,
  renderEnvFile,
} from "../../scripts/env-file.mjs";

describe("parseEnvFile", () => {
  it("reads keys and values", () => {
    const parsed = parseEnvFile("FOO=bar\nBAZ=qux");
    expect(parsed.get("FOO")).toBe("bar");
    expect(parsed.get("BAZ")).toBe("qux");
  });

  it("skips comments and blank lines", () => {
    const parsed = parseEnvFile("# a comment\n\nFOO=bar\n");
    expect(parsed.size).toBe(1);
    expect(parsed.get("FOO")).toBe("bar");
  });

  it("keeps '=' inside a value — connection strings and keys contain them", () => {
    const parsed = parseEnvFile("URL=postgresql://u:p@h/db?x=1");
    expect(parsed.get("URL")).toBe("postgresql://u:p@h/db?x=1");
  });

  it("treats an empty value as empty rather than missing", () => {
    const parsed = parseEnvFile("FOO=");
    expect(parsed.get("FOO")).toBe("");
  });
});

describe("fillPassword", () => {
  it("substitutes Supabase's bracketed placeholder", () => {
    const result = fillPassword(
      "postgresql://postgres.abc:[YOUR-PASSWORD]@host:5432/postgres",
      "hunter2",
    );
    expect(result).toBe("postgresql://postgres.abc:hunter2@host:5432/postgres");
  });

  it("URL-encodes a password containing @ — otherwise the host is truncated", () => {
    const result = fillPassword(
      "postgresql://postgres.abc:[YOUR-PASSWORD]@host:5432/postgres",
      "my@pass",
    );
    expect(result).toBe("postgresql://postgres.abc:my%40pass@host:5432/postgres");
    // The real host must survive intact.
    expect(new URL(result).hostname).toBe("host");
  });

  it("URL-encodes # and /, which would otherwise cut the string short", () => {
    const result = fillPassword(
      "postgresql://postgres.abc:[YOUR-PASSWORD]@host:5432/postgres",
      "a#b/c",
    );
    expect(new URL(result).pathname).toBe("/postgres");
    expect(new URL(result).password).toBe("a%23b%2Fc");
  });

  it("leaves a string with no placeholder untouched", () => {
    const already = "postgresql://postgres.abc:realpassword@host:5432/postgres";
    expect(fillPassword(already, "ignored")).toBe(already);
  });
});

describe("preview", () => {
  it("fully masks a short value", () => {
    expect(preview("abc")).toBe("•••");
  });

  it("shows only the ends of a long value", () => {
    const result = preview("abcdefghijklmnopqrstuvwxyz");
    expect(result).toContain("abcdef");
    expect(result).toContain("wxyz");
    expect(result).not.toContain("ghijklmnopqrst");
  });
});

describe("renderEnvFile", () => {
  it("writes the answers it was given", () => {
    const rendered = renderEnvFile(
      new Map([
        ["NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co"],
        ["DATABASE_URL", "postgresql://a:b@c:6543/postgres"],
      ]),
    );
    expect(rendered).toContain(
      "NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co",
    );
    expect(rendered).toContain("DATABASE_URL=postgresql://a:b@c:6543/postgres");
  });

  it("carries forward existing values the prompts did not ask about", () => {
    const rendered = renderEnvFile(
      new Map(),
      new Map([["STRIPE_SECRET_KEY", "sk_test_123"]]),
    );
    expect(rendered).toContain("STRIPE_SECRET_KEY=sk_test_123");
  });

  it("round-trips through the parser", () => {
    const answers = new Map([
      ["NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co"],
      ["SUPABASE_SERVICE_ROLE_KEY", "service-key"],
    ]);
    const parsed = parseEnvFile(renderEnvFile(answers));
    expect(parsed.get("NEXT_PUBLIC_SUPABASE_URL")).toBe(
      "https://x.supabase.co",
    );
    expect(parsed.get("SUPABASE_SERVICE_ROLE_KEY")).toBe("service-key");
  });

  it("puts no comment on the same line as a value", () => {
    // An inline comment can end up inside the value — this is the bug that
    // made the original .env.example unusable.
    const rendered = renderEnvFile(new Map([["DATABASE_URL", "postgres://x"]]));
    for (const line of rendered.split("\n")) {
      if (line.startsWith("#") || !line.includes("=")) continue;
      expect(line).not.toContain("#");
    }
  });

  it("defaults the app URL to localhost", () => {
    expect(renderEnvFile(new Map())).toContain(
      "NEXT_PUBLIC_APP_URL=http://localhost:3000",
    );
  });
});
