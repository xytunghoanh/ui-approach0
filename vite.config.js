import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { handleRelayRequest } from './relay.js'

function relayPlugin() {
  return {
    name: 'a0-relay-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        const pathname = url.pathname

        if (
          pathname === '/search-relay' ||
          pathname === '/search-relay/' ||
          pathname === '/search-relay.php' ||
          pathname === '/click-relay' ||
          pathname === '/click-relay/' ||
          pathname === '/click-relay.php'
        ) {
          const protocol = req.socket?.encrypted ? 'https' : 'http'
          const fullUrl = `${protocol}://${req.headers.host || 'localhost'}${req.url}`

          let body = undefined
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks = []
            for await (const chunk of req) {
              chunks.push(chunk)
            }
            body = Buffer.concat(chunks)
          }

          const webReq = new Request(fullUrl, {
            method: req.method,
            headers: req.headers,
            body: body,
          })

          const webRes = await handleRelayRequest(webReq)
          if (webRes) {
            res.statusCode = webRes.status
            webRes.headers.forEach((val, key) => {
              res.setHeader(key, val)
            })
            const text = await webRes.text()
            res.end(text)
            return
          }
        }
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load env variables from .env, .env.local, etc.
  const env = loadEnv(mode, process.cwd(), '')

  let relayUrl =
    env.A0_RELAY_URL ||
    env.VITE_A0_RELAY_URL ||
    process.env.A0_RELAY_URL ||
    '/search-relay/'

  relayUrl = relayUrl.trim()
  if (
    !relayUrl.startsWith('http://') &&
    !relayUrl.startsWith('https://') &&
    !relayUrl.startsWith('//') &&
    !relayUrl.startsWith('/')
  ) {
    relayUrl = `http://${relayUrl}`
  }

  return {
    plugins: [vue(), relayPlugin()],
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
        '@': fileURLToPath(new URL('./', import.meta.url)),
      },
    },
  }
})
