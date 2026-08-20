import { loadLibrary } from '../utils/library'
import { emit } from '../utils/projections'
import { projectionOf } from '../utils/projectionCache'
import { PLATFORMS, type Platform } from '../../shared/types'

/**
 * The path must appear in the platform's projection. The scripts guard
 * themselves too; this route is internet-facing and does not delegate.
 */
export default defineEventHandler(async (event) => {
  const { repoRoot } = useRuntimeConfig(event)
  const query = getQuery(event)
  const platform = (typeof query.platform === 'string' ? query.platform : '') as Platform
  const path = typeof query.path === 'string' ? query.path : ''

  if (!PLATFORMS.includes(platform) || platform === 'raw') {
    throw createError({ statusCode: 400, statusMessage: `not a compiled platform: ${platform}` })
  }
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'path is required' })
  }

  const files = await loadLibrary(repoRoot as string)
  const { entries } = await projectionOf(platform, repoRoot as string, files)
  if (!entries.some((e) => e.projectedPath === path)) {
    throw createError({ statusCode: 404, statusMessage: `not in the ${platform} projection` })
  }

  try {
    const content = await emit(platform, repoRoot as string, path)
    return { platform, path, content, bytes: Buffer.byteLength(content) }
  } catch {
    throw createError({ statusCode: 500, statusMessage: `could not compile: ${path}` })
  }
})
