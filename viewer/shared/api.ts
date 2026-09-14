// API URLs. One builder per route, used by the client, the handlers' mirror
// image (they strip the `.json` back off) and the prerender enumerator, so the
// static build and the dev server cannot disagree about a path.

import type { CompiledPlatform, Platform } from './types'

/** Platforms with a compiled form. `raw` is the repo itself. */
export const COMPILED_PLATFORMS: readonly CompiledPlatform[] = ['claude-plugin', 'codex']

export function apiFiles(): string {
  return '/api/files.json'
}

export function apiSearchIndex(): string {
  return '/api/search-index.json'
}

export function apiProjection(platform: Platform): string {
  return `/api/projection/${platform}.json`
}

export function apiFile(repoRelPath: string): string {
  return `/api/file/${repoRelPath}.json`
}

export function apiProjectedFile(platform: CompiledPlatform, projectedPath: string): string {
  return `/api/projected-file/${platform}/${projectedPath}.json`
}

/** Inverse of the `.json` the builders append. */
export function stripJsonSuffix(s: string): string {
  return s.endsWith('.json') ? s.slice(0, -'.json'.length) : s
}

export function isCompiledPlatform(p: string): p is CompiledPlatform {
  return (COMPILED_PLATFORMS as readonly string[]).includes(p)
}

/** Library markdown — always readable, whatever the projections say. */
export function isLibraryMarkdown(p: string): boolean {
  return /^(SKILLS|AGENTS|KNOWLEDGE)\//.test(p) && p.endsWith('.md')
}
