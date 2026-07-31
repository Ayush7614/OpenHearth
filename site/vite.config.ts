import { defineConfig } from "vite";

export default defineConfig({
  base: "/GitBook/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
