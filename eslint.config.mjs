import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    // Agent worktrees and local settings, not application code. Without this
  // a worktree checked out under .claude/ gets linted as a second copy of
  // the repo, which buries src/ under tens of thousands of problems and
  // makes the gate useless exactly when it would catch something.
  ".claude/**",
  ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
