import * as esbuild from "esbuild";
import { chmodSync } from "node:fs";

await esbuild.build({
  entryPoints: ["src/cli.ts"],
  outfile: "dist/cli.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  banner: {
    js: "#!/usr/bin/env node",
  },
  external: [],
});

chmodSync("dist/cli.js", 0o755);
console.log("Bundled dist/cli.js");
