import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleApi } from './server/handlers.js'

// Serves /api/* in dev and preview with the same handlers Vercel runs, so keys stay server-side.
function atlasApi(env) {
  const mount = (server) => {
    server.middlewares.use('/api', async (req, res, next) => {
      const route = (req.url || '').split('?')[0].replace(/^\//, '')
      if (!['chat', 'ext', 'status'].includes(route)) return next()
      await handleApi(route, req, res, env)
    })
  }
  return { name: 'atlas-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), atlasApi(env)],
    build: { chunkSizeWarningLimit: 5000 },
    server: { host: true, port: 5173 },
  }
})
