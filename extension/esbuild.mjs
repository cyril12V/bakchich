import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  platform: "node",
  format: "cjs",
  sourcemap: watch,
  minify: !watch,
});

if (watch) {
  await ctx.watch();
  console.log("👀 watch mode");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("✅ build ok → dist/extension.js");
}
