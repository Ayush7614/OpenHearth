import * as esbuild from "esbuild";
import { chmodSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

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
  define: {
    __OPENHEARTH_VERSION__: JSON.stringify(pkg.version),
  },
  external: [],
});

chmodSync("dist/cli.js", 0o755);
console.log(`Bundled dist/cli.js (v${pkg.version})`);
