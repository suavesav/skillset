// Search over the prerendered index. Ran on the server until the viewer became
// a static site; the ranking is unchanged.

import type { SearchIndexEntry, SearchMatch } from './types'

const EXCERPT_RADIUS = 60

/**
 * Name matches first (by where the match starts, then alphabetically), then
 * body matches over the raw file including frontmatter. A file matched by name
 * is never repeated as a body match. Projected content is not searched.
 */
export function searchIndex(entries: SearchIndexEntry[], q: string): SearchMatch[] {
  const trimmed = q.trim()
  if (!trimmed) return []

  const needle = trimmed.toLowerCase()
  const nameMatches: SearchMatch[] = []
  const bodyMatches: SearchMatch[] = []
  const nameSeen = new Set<string>()

  for (const f of entries) {
    if (f.name.toLowerCase().includes(needle)) {
      nameMatches.push({ name: f.name, path: f.path, kind: f.kind, matchType: 'name' })
      nameSeen.add(f.name)
    }
  }

  for (const f of entries) {
    if (nameSeen.has(f.name)) continue
    const raw = f.content
    const idx = raw.toLowerCase().indexOf(needle)
    if (idx === -1) continue
    const start = Math.max(0, idx - EXCERPT_RADIUS)
    const end = Math.min(raw.length, idx + needle.length + EXCERPT_RADIUS)
    const excerpt = (start > 0 ? '…' : '') + raw.slice(start, end).replace(/\s+/g, ' ').trim() + (end < raw.length ? '…' : '')
    bodyMatches.push({ name: f.name, path: f.path, kind: f.kind, matchType: 'body', excerpt })
  }

  nameMatches.sort((a, b) => {
    const ai = a.name.toLowerCase().indexOf(needle)
    const bi = b.name.toLowerCase().indexOf(needle)
    if (ai !== bi) return ai - bi
    return a.name.localeCompare(b.name)
  })
  bodyMatches.sort((a, b) => a.name.localeCompare(b.name))

  return [...nameMatches, ...bodyMatches]
}
