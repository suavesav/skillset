import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadLibrary } from '../utils/library'
import type { SearchMatch, SearchResponse } from '../../shared/types'

const EXCERPT_RADIUS = 60

export default defineEventHandler(async (event): Promise<SearchResponse> => {
  const { repoRoot } = useRuntimeConfig(event)
  const root = repoRoot as string
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  if (!q) return { query: '', matches: [] }

  const needle = q.toLowerCase()
  const files = await loadLibrary(root)

  const nameMatches: SearchMatch[] = []
  const bodyMatches: SearchMatch[] = []
  const nameSeen = new Set<string>()

  for (const f of files) {
    if (f.name.toLowerCase().includes(needle)) {
      nameMatches.push({ name: f.name, path: f.path, kind: f.kind, matchType: 'name' })
      nameSeen.add(f.name)
    }
  }

  await Promise.all(
    files.map(async (f) => {
      if (nameSeen.has(f.name)) return
      try {
        const raw = await readFile(join(root, f.path), 'utf-8')
        const idx = raw.toLowerCase().indexOf(needle)
        if (idx === -1) return
        const start = Math.max(0, idx - EXCERPT_RADIUS)
        const end = Math.min(raw.length, idx + needle.length + EXCERPT_RADIUS)
        const excerpt = (start > 0 ? '…' : '') + raw.slice(start, end).replace(/\s+/g, ' ').trim() + (end < raw.length ? '…' : '')
        bodyMatches.push({ name: f.name, path: f.path, kind: f.kind, matchType: 'body', excerpt })
      } catch {
        /* skip */
      }
    })
  )

  nameMatches.sort((a, b) => {
    const ai = a.name.toLowerCase().indexOf(needle)
    const bi = b.name.toLowerCase().indexOf(needle)
    if (ai !== bi) return ai - bi
    return a.name.localeCompare(b.name)
  })
  bodyMatches.sort((a, b) => a.name.localeCompare(b.name))

  return { query: q, matches: [...nameMatches, ...bodyMatches] }
})
