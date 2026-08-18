import type { DriftItem, DriftStatus, LocalLocation } from '../../shared/types'

/** Rank used to order the drift list: most-actionable first. */
export const STATUS_ORDER: Record<DriftStatus, number> = {
  conflict: 0,
  drift: 1,
  'local-only': 2,
  'library-only': 3,
  unchanged: 4,
  synced: 5
}

export function aggregateStatus(locations: LocalLocation[]): DriftStatus {
  if (locations.length === 0) return 'library-only'
  const seen = new Set(locations.map((l) => l.status))
  if (seen.has('drift')) {
    // Two+ locations drifted independently → conflict.
    const driftCount = locations.filter((l) => l.status === 'drift').length
    return driftCount >= 2 ? 'conflict' : 'drift'
  }
  if (seen.has('unchanged')) return 'unchanged'
  if (seen.has('synced')) return 'synced'
  return 'local-only'
}

export function sortItems(a: DriftItem, b: DriftItem): number {
  const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  if (s !== 0) return s
  if (a.kind !== b.kind) return a.kind === 'SKILL' ? -1 : 1
  return a.name.localeCompare(b.name)
}

export type LocalPathKind =
  | { kind: 'SKILL'; name: string }
  | { kind: 'AGENT'; name: string; owningSkill: string | null }
  | null

/**
 * Classify a path into what it represents, tolerant of where the user rooted
 * the picker — works whether they granted `~/.claude` (paths like
 * `skills/<name>/SKILL.md`) or `~/.claude/skills` (paths like `<name>/SKILL.md`).
 * Recognizes:
 *   …/<name>/SKILL.md            → skill (name = dir before SKILL.md)
 *   …/<skill>/agents/<agent>.md  → bundled agent
 *   …/agents/<name>.md           → top-level agent
 * Anything else (knowledge, references, README) → null.
 */
export function classifyLocalPath(relPath: string): LocalPathKind {
  const parts = relPath.replace(/^\.?\/+/, '').split('/').filter(Boolean)
  if (parts.length < 2) return null
  const last = parts[parts.length - 1]
  if (last === 'SKILL.md') {
    return { kind: 'SKILL', name: parts[parts.length - 2] }
  }
  if (last.toLowerCase().endsWith('.md') && parts[parts.length - 2] === 'agents') {
    // A dir above `agents/` (i.e. `<skill>/agents/<x>.md`) means bundled.
    const owningSkill = parts.length >= 3 ? parts[parts.length - 3] : null
    return { kind: 'AGENT', name: last.slice(0, -3), owningSkill }
  }
  return null
}
