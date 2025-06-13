import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    server: {
        host: "::",
        port: 8080,
    },
    plugins: [
        react(),
        mode === "development" && componentTagger(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"], // Add your static assets here
            manifest: {
                name: "Clickomator V1",
                short_name: "Clickomator",
                description: "Clickomator Application - Automate your clicks!",
                theme_color: "#ffffff", // Customize your theme color
                background_color: "#ffffff", // Customize your background color
                display: "standalone",
                scope: ".", // Relative to base path
                start_url: ".", // Relative to base path
                icons: [
                    {
                        src: "pwa-192x192.png", // Path relative to public folder
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png", // Path relative to public folder
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png", // Maskable icon, path relative to public folder
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webmanifest}"],
                runtimeCaching: [
                    {
                        urlPattern: /\/clickomator\//,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "clickomator-cache",
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                            },
                        },
                    },
                ],
                navigateFallback: "index.html",
            },
            devOptions: {
                enabled: mode === "development", // Enable PWA features in development if you want to test them
                /* when using registerType: 'autoUpdate' */
                // type: 'module',
            },
        }),
    ].filter(Boolean),
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    base: process.env.VITE_BASE_PATH || "/",
}));
