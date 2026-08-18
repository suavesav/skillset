import { ref, computed } from 'vue'
import type { FilesResponse, LibraryFile } from '../shared/types'

/**
 * App-global "filter by team bundle". Singleton so the topbar dropdown and every
 * view (graph, files, diff) share one selection. A team selects its skills (by
 * `teams:` frontmatter, incl. `all`) plus everything they transitively reference
 * — the same closure a team plugin ships — so agents/knowledge come along.
 */

const selected = ref('') // '' = all teams
const files = ref<LibraryFile[]>([])
let loaded = false

async function ensureLoaded() {
  if (loaded) return
  loaded = true
  try {
    const res = await $fetch<FilesResponse>('/api/files')
    files.value = res.files
  } catch {
    loaded = false // allow a retry on next mount
  }
}

const teams = computed(() => {
  const s = new Set<string>()
  for (const f of files.value) for (const t of f.teams ?? []) if (t !== 'all') s.add(t)
  return [...s].sort()
})

/** Names in the selected team's closure, or null when no team is selected. */
const closure = computed<Set<string> | null>(() => {
  if (!selected.value) return null
  const byName = new Map(files.value.map((f) => [f.name, f]))
  const out = new Set<string>()
  const stack = files.value
    .filter((f) => f.kind === 'SKILL' && (f.teams ?? []).some((t) => t === selected.value || t === 'all'))
    .map((f) => f.name)
  while (stack.length) {
    const n = stack.pop()!
    if (out.has(n)) continue
    out.add(n)
    const f = byName.get(n)
    if (f) for (const l of f.links) if (!out.has(l.name)) stack.push(l.name)
  }
  return out
})

/** True when `name` passes the current team filter (always true with no team). */
function inTeam(name: string): boolean {
  return closure.value ? closure.value.has(name) : true
}

export function useTeamFilter() {
  ensureLoaded()
  return { selected, teams, closure, inTeam }
}
