import { defineConfig } from "vite";

export default defineConfig({
  base: "/OpenHearth/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
