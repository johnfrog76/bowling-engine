import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Served from a project page (johnfrog76.github.io/bowling-engine) as well
  // as from a dev server at the root, so asset URLs stay relative.
  //
  // `public/.nojekyll` is copied into the build for the same reason: GitHub
  // Pages runs Jekyll over an artifact unless told not to, and Jekyll skips
  // paths beginning with an underscore -- which is exactly what a hashed asset
  // bundle can produce. An empty file turns the whole pipeline off.
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
