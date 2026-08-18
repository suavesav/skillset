import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { LibraryFile } from '../../shared/types'
import type { DriftItem, DriftStatus, LocalLocation } from '../../shared/types'
import { normalize } from './driftNormalize'
import { aggregateStatus, classifyLocalPath, sortItems } from './driftShared'

export interface LocalFileInput {
  /** Path relative to the picked ~/.claude folder. */
  path: string
  content: string
}

/** One local file: its real (browser-relative) path plus content. */
interface LocalEntry { path: string; content: string }

/** A local install parsed out of browser-supplied file contents. */
interface ParsedLocal {
  skills: Map<string, LocalEntry>
  topAgents: Map<string, LocalEntry>
  bundledAgents: Map<string, Array<LocalEntry & { owningSkill: string }>>
}

function parseLocal(files: LocalFileInput[]): ParsedLocal {
  const skills = new Map<string, LocalEntry>()
  const topAgents = new Map<string, LocalEntry>()
  const bundledAgents = new Map<string, Array<LocalEntry & { owningSkill: string }>>()
  for (const f of files) {
    const c = classifyLocalPath(f.path)
    if (!c) continue
    if (c.kind === 'SKILL') {
      skills.set(c.name, { path: f.path, content: f.content })
    } else if (c.owningSkill) {
      const arr = bundledAgents.get(c.name) ?? []
      arr.push({ owningSkill: c.owningSkill, path: f.path, content: f.content })
      bundledAgents.set(c.name, arr)
    } else {
      topAgents.set(c.name, { path: f.path, content: f.content })
    }
  }
  return { skills, topAgents, bundledAgents }
}

/**
 * Compute drift between browser-supplied local files and the library, without
 * touching the server's filesystem for the local side. The library side is
 * still read from repoRoot (the GitHub snapshot). Content equality (after
 * normalization) is the drift signal — there are no symlinks over the wire, so
 * "synced" collapses into "unchanged".
 */
export async function computeDriftFromFiles(
  files: LocalFileInput[],
  library: LibraryFile[],
  repoRoot: string
): Promise<DriftItem[]> {
  const libraryNames = new Set(library.map((f) => f.name))
  const local = parseLocal(files)
  const items: DriftItem[] = []

  const norm = (s: string) => normalize(s, { libraryNames })

  async function libNorm(path: string): Promise<string> {
    return norm(await readFile(join(repoRoot, path), 'utf-8'))
  }

  // --- Skills ---
  const skillsByName = new Map(library.filter((f) => f.kind === 'SKILL').map((f) => [f.name, f]))
  const seenSkills = new Set<string>()
  for (const [name, libFile] of skillsByName) {
    seenSkills.add(name)
    const localEntry = local.skills.get(name)
    if (localEntry === undefined) {
      items.push({ name, kind: 'SKILL', libraryPath: libFile.path, teams: libFile.teams, status: 'library-only', locations: [] })
      continue
    }
    const status: DriftStatus = norm(localEntry.content) === (await libNorm(libFile.path)) ? 'unchanged' : 'drift'
    items.push({
      name,
      kind: 'SKILL',
      libraryPath: libFile.path,
      teams: libFile.teams,
      status,
      locations: [{ localPath: localEntry.path, owningSkill: null, isSymlink: false, status }]
    })
  }
  for (const [name, entry] of local.skills) {
    if (seenSkills.has(name)) continue
    items.push({
      name, kind: 'SKILL', libraryPath: null, status: 'local-only',
      locations: [{ localPath: entry.path, owningSkill: null, isSymlink: false, status: 'local-only' }]
    })
  }

  // --- Agents ---
  const agentsByName = new Map(library.filter((f) => f.kind === 'AGENT').map((f) => [f.name, f]))
  const seenAgents = new Set<string>()
  for (const [name, libFile] of agentsByName) {
    seenAgents.add(name)
    const locations: LocalLocation[] = []
    const libN = await libNorm(libFile.path)
    const top = local.topAgents.get(name)
    if (top !== undefined) {
      const status: DriftStatus = norm(top.content) === libN ? 'unchanged' : 'drift'
      locations.push({ localPath: top.path, owningSkill: null, isSymlink: false, status })
    }
    for (const b of local.bundledAgents.get(name) ?? []) {
      const status: DriftStatus = norm(b.content) === libN ? 'unchanged' : 'drift'
      locations.push({ localPath: b.path, owningSkill: b.owningSkill, isSymlink: false, status })
    }
    if (locations.length === 0) {
      items.push({ name, kind: 'AGENT', libraryPath: libFile.path, teams: libFile.teams, status: 'library-only', locations: [] })
      continue
    }
    items.push({ name, kind: 'AGENT', libraryPath: libFile.path, teams: libFile.teams, status: aggregateStatus(locations), locations })
  }
  for (const [name, entry] of local.topAgents) {
    if (seenAgents.has(name)) continue
    seenAgents.add(name)
    items.push({
      name, kind: 'AGENT', libraryPath: null, status: 'local-only',
      locations: [{ localPath: entry.path, owningSkill: null, isSymlink: false, status: 'local-only' }]
    })
  }
  for (const [name, bundled] of local.bundledAgents) {
    if (seenAgents.has(name)) continue
    items.push({
      name, kind: 'AGENT', libraryPath: null, status: 'local-only',
      locations: bundled.map((b) => ({
        localPath: b.path,
        owningSkill: b.owningSkill, isSymlink: false, status: 'local-only' as DriftStatus
      }))
    })
  }

  return items.sort(sortItems)
}
