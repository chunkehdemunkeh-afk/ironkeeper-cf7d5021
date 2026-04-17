import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// Custom plugin to guarantee sw.js changes its hash every build.
// This ensures the browser's Service Worker update mechanism triggers.
const swBuildTimestampPlugin = () => ({
  name: "sw-build-timestamp",
  apply: "build" as const,
  writeBundle() {
    const swPath = path.resolve(__dirname, "dist/sw.js");
    if (fs.existsSync(swPath)) {
      fs.appendFileSync(swPath, `\n// IK_BUILD_STAMP: ${Date.now()}\n`);
    }
    // Regenerate version.json every build so the iOS PWA pre-boot guard
    // can detect a new deploy and hard-reload past the standalone cache.
    const versionPath = path.resolve(__dirname, "dist/version.json");
    const ts = Date.now();
    fs.writeFileSync(
      versionPath,
      JSON.stringify(
        { version: `1.${ts}`, buildTime: new Date(ts).toISOString() },
        null,
        2
      )
    );
  },
});

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    swBuildTimestampPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
