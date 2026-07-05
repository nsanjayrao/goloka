import { defineConfig } from "vitest/config";

// Only the pure-logic layer is tested (lib/*) - no React component rendering,
// so the default Node environment is enough; no jsdom/RTL dependency needed.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
