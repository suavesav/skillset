import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  ssr: false,
  css: ['~/assets/tokens.css'],
  runtimeConfig: {
    repoRoot: process.env.SKILLSET_REPO_ROOT || resolve(here, '..')
  },
  app: {
    head: {
      title: 'skillset Viewer',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  }
})
