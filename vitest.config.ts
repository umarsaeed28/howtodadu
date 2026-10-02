import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Agent worktrees live under .claude/worktrees; their copies of the tests are not this checkout's.
    exclude: ["**/node_modules/**", "**/.claude/**", "**/.next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
