import { loadLibrary } from '../../utils/library'
import { projectionOf } from '../../utils/projectionCache'
import { stripJsonSuffix } from '../../../shared/api'
import { PLATFORMS, type Platform, type ProjectionResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ProjectionResponse> => {
  const { repoRoot } = useRuntimeConfig(event)
  // The route is `[platform].get.ts`, not `[platform].json.get.ts`: the latter
  // would name the param "platform.json".
  const platform = stripJsonSuffix(getRouterParam(event, 'platform') || '') as Platform
  if (!PLATFORMS.includes(platform)) {
    throw createError({ statusCode: 400, statusMessage: `unknown platform: ${platform}` })
  }

  const files = await loadLibrary(repoRoot as string)
  const { entries } = await projectionOf(platform, repoRoot as string, files)
  return { platform, entries }
})
