import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  // Load env variables from .env, .env.local, etc.
  const env = loadEnv(mode, process.cwd(), "");

  let relayUrl =
    env.A0_RELAY_URL ||
    env.VITE_A0_RELAY_URL ||
    process.env.A0_RELAY_URL ||
    "http://localhost:8080/search-relay.php";

  relayUrl = relayUrl.trim();
  if (
    !relayUrl.startsWith("http://") &&
    !relayUrl.startsWith("https://") &&
    !relayUrl.startsWith("//") &&
    !relayUrl.startsWith("/")
  ) {
    relayUrl = `http://${relayUrl}`;
  }

  return {
    plugins: [vue()],
    define: {
      A0_RELAY_URL: JSON.stringify(relayUrl),
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    },
    server: {
      port: 19985,
      strictPort: true,
    },
    preview: {
      port: 19985,
      strictPort: true,
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./", import.meta.url)),
      },
    },
  };
});
