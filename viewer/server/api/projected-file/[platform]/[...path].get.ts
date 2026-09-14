import { loadLibrary } from '../../../utils/library'
import { emit } from '../../../utils/projections'
import { compiledOf, projectionOf } from '../../../utils/projectionCache'
import { isCompiledPlatform, stripJsonSuffix } from '../../../../shared/api'
import type { ProjectedFileResponse } from '../../../../shared/types'

/**
 * The path must appear in the platform's projection. The scripts guard
 * themselves too; this route is internet-facing and does not delegate.
 */
export default defineEventHandler(async (event): Promise<ProjectedFileResponse> => {
  const { repoRoot } = useRuntimeConfig(event)
  const root = repoRoot as string
  const platform = getRouterParam(event, 'platform') || ''
  const path = stripJsonSuffix(getRouterParam(event, 'path') || '')

  if (!isCompiledPlatform(platform)) {
    throw createError({ statusCode: 400, statusMessage: `not a compiled platform: ${platform}` })
  }
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'path is required' })
  }

  const files = await loadLibrary(root)
  const { entries } = await projectionOf(platform, root, files)
  if (!entries.some((e) => e.projectedPath === path)) {
    throw createError({ statusCode: 404, statusMessage: `not in the ${platform} projection` })
  }

  // Prerendering asks for every projected file, so it compiles them all at once
  // and serves from that. Dev keeps the single-file path: one edit, one rebuild.
  if (import.meta.prerender) {
    const hit = (await compiledOf(platform, root)).get(path)
    if (!hit) {
      throw createError({ statusCode: 500, statusMessage: `could not compile: ${path}` })
    }
    return { platform, path, content: hit.content, bytes: hit.bytes }
  }

  try {
    const content = await emit(platform, root, path)
    return { platform, path, content, bytes: Buffer.byteLength(content) }
  } catch {
    throw createError({ statusCode: 500, statusMessage: `could not compile: ${path}` })
  }
})
