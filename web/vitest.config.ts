import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Only the pure-logic layer is tested (lib/*) - no React component rendering,
// so the default Node environment is enough; no jsdom/RTL dependency needed.
export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./*" path alias. Next.js's own
    // bundler already understands that alias; vitest doesn't share it, so
    // without this a test importing anything that uses an "@/..." import
    // (e.g. lib/data.ts) fails to resolve the module.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
