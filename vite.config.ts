import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

function autoBumpVersion(buildVersion: string) {
  return {
    name: "auto-bump-version",
    buildStart() {
      const versionFile = path.resolve(__dirname, "public/version.json");
      const buildTime = new Date().toISOString();
      fs.writeFileSync(versionFile, JSON.stringify({ version: buildVersion, buildTime }, null, 2));
    },
  };
}

export default defineConfig(({ mode }) => {
  const buildVersion = mode === "production" ? `1.0.${Date.now()}` : "dev";

  return {
    define: {
      __APP_VERSION__: JSON.stringify(buildVersion),
    },
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
      mode === "production" && autoBumpVersion(buildVersion),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico"],
        workbox: {
          navigateFallbackDenylist: [/^\/~oauth/],
          clientsClaim: true,
          skipWaiting: true,   // new SW takes control immediately — no waiting for tabs to close
        },
        manifest: {
          name: "Iron Keeper",
          short_name: "Iron Keeper",
          description: "Track your workouts and crush your goals",
          theme_color: "#111318",
          background_color: "#111318",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
