import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function privacyPolicyRoute() {
  const rewritePrivacyPath = (request: { url?: string }, _response: unknown, next: () => void) => {
    if (request.url === '/privacy' || request.url === '/privacy/' || request.url?.startsWith('/privacy?') || request.url?.startsWith('/privacy/?')) {
      request.url = `/privacy/index.html${request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : ''}`
    }
    next()
  }

  return {
    name: 'lessoncanvas-privacy-policy-route',
    configureServer(server: { middlewares: { use: (handler: typeof rewritePrivacyPath) => void } }) {
      server.middlewares.use(rewritePrivacyPath)
    },
    configurePreviewServer(server: { middlewares: { use: (handler: typeof rewritePrivacyPath) => void } }) {
      server.middlewares.use(rewritePrivacyPath)
    },
  }
}

export default defineConfig({
  plugins: [privacyPolicyRoute(), react()],
})
