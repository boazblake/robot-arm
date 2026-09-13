import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import mkcert from "vite-plugin-mkcert";
import legacy from "@vitejs/plugin-legacy";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const isMobile = mode === "mobile";
  const isSSL = mode === "ssl";
  const certKeyPath = "./.cert/key.pem";
  const certPath = "./.cert/cert.pem";
  const hasCertificates = fs.existsSync(certKeyPath) && fs.existsSync(certPath);
  console.log("Vite mode:", mode, "isSSL:", isSSL, "isMobile:", isMobile);

  const alias: Record<string, string> = {
    "@": path.resolve(__dirname, "./src"),
    "@components": path.resolve(__dirname, "./src/shared/components"),
    "@pages": path.resolve(__dirname, "./src/features"),
    "@utils": path.resolve(__dirname, "./src/shared/utils"),
    "@types": path.resolve(__dirname, "./src/types"),
  };

  // When not building for mobile, we replace the native plugin definition
  // with our web-based shim.
  if (!isMobile) {
    const webMediaPipeShim = path.resolve(
      __dirname,
      "./src/shims/capacitor-media-pipe.ts"
    );
    alias["@/pages/Pose/media-pipe"] = webMediaPipeShim;
    alias["capacitor-media-pipe"] = webMediaPipeShim;
  }

  return {
    base: isMobile ? "/" : "/lift-mate/",
    plugins: [
      nodePolyfills({
        include: ["process"], // Polyfill process.env
        globals: {
          process: true,
        },
      }),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: {
          enabled: false,
        },
        strategies: "generateSW",
        workbox: {
          globDirectory: "docs", // Match build.outDir
          globPatterns: ["**/*.{js,wasm,css,html,png,jpg,jpeg,svg,ico}"],
          globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js"],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === "document",
              handler: "NetworkFirst",
            },
            {
              urlPattern: ({ request }) =>
                request.destination === "script" ||
                request.destination === "style",
              handler: "StaleWhileRevalidate",
            },
          ],
        },
        manifest: {
          name: "Lift Mate",
          short_name: "LiftMate",
          description: "Your personal fitness tracking app",
          theme_color: "#ffffff",
          icons: [
            {
              src: "icon.svg",
              sizes: "192x192",
              type: "image/svg+xml",
            },
          ],
        },
      }),
      viteStaticCopy({
        targets: [
          {
            src: "node_modules/@ionic/core/dist/ionic/*",
            dest: ".",
            rename: { stripBase: true },
          },
        ],
      }),
      legacy({
        targets: ["ie >= 11"],
        additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      }),
      !isMobile && mkcert(),
    ],
    resolve: {
      alias,
      dedupe: ["@capacitor/core"],
    },
    build: {
      outDir: "docs",
      assetsDir: "assets",
      minify: "terser",
      rollupOptions: {
        external: ["react", "react-dom"], // Exclude React
      },
    },
    server:
      !isMobile || isSSL
        ? {
            port: 8101,
            strictPort: true,
            ...(hasCertificates
              ? {
                  https: {
                    key: fs.readFileSync(certKeyPath),
                    cert: fs.readFileSync(certPath),
                  },
                }
              : {}),
          }
        : {
            host: "localhost",
            port: 8101,
            strictPort: true,
          },
    optimizeDeps: {
      exclude: [
        "@ionic/core",
        "ion-menu",
        "ion-tab-bar",
        "ion-tab",
        "ion-item",
        "ion-button",
        "ion-app",
        "react",
        "react-dom",
      ],
    },
  };
});
