import { loadLibrary } from './library'
import { project } from './projections'
import {
  COMPILED_PLATFORMS,
  apiFile,
  apiFiles,
  apiProjectedFile,
  apiProjection,
  apiSearchIndex
} from '../../shared/api'
import { PLATFORMS } from '../../shared/types'

/**
 * Every API route the static build must write to disk. A JSON response is never
 * scanned for links, so nothing here can be discovered by crawling — the set has
 * to be enumerated up front. Imports nothing from nitro: `nuxt.config.ts` loads
 * this directly.
 */
export async function prerenderRoutes(repoRoot: string): Promise<string[]> {
  const files = await loadLibrary(repoRoot)
  const routes = new Set<string>([apiFiles(), apiSearchIndex()])

  for (const platform of PLATFORMS) routes.add(apiProjection(platform))
  for (const f of files) routes.add(apiFile(f.path))

  for (const platform of COMPILED_PLATFORMS) {
    for (const e of await project(platform, repoRoot, files)) {
      routes.add(apiProjectedFile(platform, e.projectedPath))
      // Sources and build inputs the file route serves: VERSION, the preambles,
      // ASSETS/*. Same set the file handler authorizes against.
      if (e.sourcePath) routes.add(apiFile(e.sourcePath))
      for (const input of e.inputs ?? []) routes.add(apiFile(input))
    }
  }

  return [...routes]
}
