import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { prerenderRoutes } from './server/utils/prerenderRoutes'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = process.env.SKILLSET_REPO_ROOT || resolve(here, '..')

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  ssr: false,
  css: ['~/assets/tokens.css'],
  runtimeConfig: {
    repoRoot
  },
  nitro: {
    prerender: {
      // A projection script that fails mid-build fails the deploy rather than
      // publishing a site with holes in it.
      failOnError: true
    }
  },
  hooks: {
    // In the hook, not at config load: nitro fires this only under `nuxi
    // generate`, so `nuxt dev` never shells out to the platform scripts.
    async 'prerender:routes'({ routes }) {
      for (const route of await prerenderRoutes(repoRoot)) routes.add(route)
      // Pages would serve these as directories and redirect `/files?path=…` to
      // a trailing slash, dropping the query. 404.html answers them instead.
      routes.delete('/files')
      routes.delete('/graph')
    }
  },
  app: {
    head: {
      title: 'skillset Viewer',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  }
})
