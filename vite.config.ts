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
