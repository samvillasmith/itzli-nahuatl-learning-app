import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./scripts/lib/server-only-offline.cjs", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Full-course inventories are large; keep CI memory and CPU use predictable.
    maxWorkers: 4,
  },
});
