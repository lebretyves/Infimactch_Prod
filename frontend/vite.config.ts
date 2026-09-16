import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      headers: {
        "Referrer-Policy": "no-referrer-when-downgrade",
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || "http://127.0.0.1:3100",
          changeOrigin: false,
        },
      },
    },
    build: { target: "es2022", cssCodeSplit: true },
  };
});
