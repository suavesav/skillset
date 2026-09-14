import { describe, it, expect, beforeAll } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadLibrary } from '../server/utils/library'
import { project } from '../server/utils/projections'
import { prerenderRoutes } from '../server/utils/prerenderRoutes'
import {
  COMPILED_PLATFORMS,
  apiFile,
  apiFiles,
  apiProjectedFile,
  apiProjection,
  apiSearchIndex,
  stripJsonSuffix
} from '../shared/api'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

let routes: string[]

beforeAll(async () => {
  routes = await prerenderRoutes(REPO_ROOT)
}, 120_000)

describe('prerenderRoutes', () => {
  it('emits only writable API routes', () => {
    expect(routes.length).toBeGreaterThan(0)
    for (const r of routes) {
      expect(r.startsWith('/api/'), r).toBe(true)
      expect(r.endsWith('.json'), r).toBe(true)
      // A route with a query string is refused by the prerenderer; ".." would
      // escape the output directory.
      expect(r.includes('?'), r).toBe(false)
      expect(r.includes('..'), r).toBe(false)
    }
  })

  it('has no duplicates', () => {
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('covers the index routes and every platform projection', () => {
    expect(routes).toContain(apiFiles())
    expect(routes).toContain(apiSearchIndex())
    // FileTree asks for raw's projection too.
    expect(routes).toContain(apiProjection('raw'))
    for (const p of COMPILED_PLATFORMS) expect(routes).toContain(apiProjection(p))
  })

  it('covers every library file', async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const f of files) expect(routes).toContain(apiFile(f.path))
  })

  it('covers every projected file of every compiled platform', { timeout: 120_000 }, async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const platform of COMPILED_PLATFORMS) {
      for (const e of await project(platform, REPO_ROOT, files)) {
        expect(routes, `${platform}: ${e.projectedPath}`).toContain(
          apiProjectedFile(platform, e.projectedPath)
        )
      }
    }
  })

  it('covers build inputs that are not library files', () => {
    // These are read through /api/file even though loadLibrary never sees them.
    expect(routes).toContain(apiFile('VERSION'))
    expect(routes).toContain(apiFile('ASSETS/simbench.mjs'))
    expect(routes).toContain(apiFile('platforms/claude-plugin/preamble.md'))
    expect(routes).toContain(apiFile('platforms/codex/preamble.md'))
  })

  it('round-trips a file route back to its repo path', () => {
    const path = 'SKILLS/encounter-tuner.md'
    const route = apiFile(path)
    expect(stripJsonSuffix(route.slice('/api/file/'.length))).toBe(path)
  })
})
