import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "/OpenHearth/",
  resolve: {
    alias: {
      "@felix-ayush/openhearth-core": fileURLToPath(
        new URL("../packages/core/src/index.ts", import.meta.url)
      ),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  define: {
    "process.env.GITHUB_TOKEN": '""',
    "process.env.GH_TOKEN": '""',
  },
});
