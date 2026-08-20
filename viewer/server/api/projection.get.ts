import { loadLibrary } from '../utils/library'
import { projectionOf } from '../utils/projectionCache'
import { PLATFORMS, type Platform } from '../../shared/types'

export default defineEventHandler(async (event) => {
  const { repoRoot } = useRuntimeConfig(event)
  const query = getQuery(event)
  const platform = (typeof query.platform === 'string' ? query.platform : 'raw') as Platform
  if (!PLATFORMS.includes(platform)) {
    throw createError({ statusCode: 400, statusMessage: `unknown platform: ${platform}` })
  }

  const files = await loadLibrary(repoRoot as string)
  const { entries } = await projectionOf(platform, repoRoot as string, files)
  return { platform, entries }
})
