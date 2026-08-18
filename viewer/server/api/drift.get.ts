import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadLibrary } from '../utils/library'
import { loadLocalInventory, readLocalText, type LocalSkillFile } from '../utils/localInstall'
import { normalize } from '../utils/driftNormalize'
import { aggregateStatus, sortItems } from '../utils/driftShared'
import type {
  DriftItem,
  DriftResponse,
  LocalLocation
} from '../../shared/types'

export default defineEventHandler(async (event): Promise<DriftResponse> => {
  const { repoRoot, claudeHome } = useRuntimeConfig(event)
  const root = repoRoot as string
  const home = claudeHome as string

  const library = await loadLibrary(root)
  const libraryNames = new Set(library.map((f) => f.name))
  const inv = await loadLocalInventory(home, root)

  const skillsByName = new Map(library.filter((f) => f.kind === 'SKILL').map((f) => [f.name, f]))
  const agentsByName = new Map(library.filter((f) => f.kind === 'AGENT').map((f) => [f.name, f]))

  const items: DriftItem[] = []

  // --- Skills ---
  const seenSkills = new Set<string>()
  for (const [name, libFile] of skillsByName) {
    seenSkills.add(name)
    const local = inv.skills.get(name)
    if (!local) {
      items.push({
        name,
        kind: 'SKILL',
        libraryPath: libFile.path,
        teams: libFile.teams,
        status: 'library-only',
        locations: []
      })
      continue
    }
    const loc = await classifyLocation(local, libFile.path, null, root, libraryNames)
    items.push({
      name,
      kind: 'SKILL',
      libraryPath: libFile.path,
      teams: libFile.teams,
      status: loc.status,
      locations: [loc]
    })
  }
  // Local-only skills (have SKILL.md but no library match)
  for (const [name, file] of inv.skills) {
    if (seenSkills.has(name)) continue
    items.push({
      name,
      kind: 'SKILL',
      libraryPath: null,
      status: 'local-only',
      locations: [{
        localPath: file.relPath,
        owningSkill: null,
        isSymlink: file.isSymlink,
        status: 'local-only'
      }]
    })
  }
  // Local-only "skill" dirs without SKILL.md (workspaces, zips)
  for (const dirName of inv.localOnlySkillDirs) {
    items.push({
      name: dirName,
      kind: 'SKILL',
      libraryPath: null,
      status: 'local-only',
      locations: [{
        localPath: `skills/${dirName}/`,
        owningSkill: null,
        isSymlink: false,
        status: 'local-only'
      }]
    })
  }

  // --- Agents ---
  const seenAgents = new Set<string>()
  for (const [name, libFile] of agentsByName) {
    seenAgents.add(name)
    const top = inv.topAgents.get(name)
    const bundled = inv.bundledAgents.get(name) ?? []
    const locations: LocalLocation[] = []

    if (top) {
      locations.push(await classifyLocation(top, libFile.path, null, root, libraryNames))
    }
    for (const b of bundled) {
      locations.push(await classifyLocation(b.file, libFile.path, b.owningSkill, root, libraryNames))
    }
    if (locations.length === 0) {
      items.push({
        name,
        kind: 'AGENT',
        libraryPath: libFile.path,
        teams: libFile.teams,
        status: 'library-only',
        locations: []
      })
      continue
    }
    items.push({
      name,
      kind: 'AGENT',
      libraryPath: libFile.path,
      teams: libFile.teams,
      status: aggregateStatus(locations),
      locations
    })
  }
  // Local-only agents (bundled or top-level) not in the library
  for (const [name, top] of inv.topAgents) {
    if (seenAgents.has(name)) continue
    items.push({
      name,
      kind: 'AGENT',
      libraryPath: null,
      status: 'local-only',
      locations: [{
        localPath: top.relPath,
        owningSkill: null,
        isSymlink: top.isSymlink,
        status: 'local-only'
      }]
    })
    seenAgents.add(name)
  }
  for (const [name, bundled] of inv.bundledAgents) {
    if (seenAgents.has(name)) continue
    items.push({
      name,
      kind: 'AGENT',
      libraryPath: null,
      status: 'local-only',
      locations: bundled.map((b) => ({
        localPath: b.file.relPath,
        owningSkill: b.owningSkill,
        isSymlink: b.file.isSymlink,
        status: 'local-only' as DriftStatus
      }))
    })
  }

  items.sort(sortItems)
  return { items }
})

async function classifyLocation(
  file: LocalSkillFile,
  libraryRelPath: string,
  owningSkill: string | null,
  repoRoot: string,
  libraryNames: Set<string>
): Promise<LocalLocation> {
  if (file.isSymlink && file.pointsIntoRepo) {
    return {
      localPath: file.relPath,
      owningSkill,
      isSymlink: true,
      status: 'synced'
    }
  }
  const [localRaw, libRaw] = await Promise.all([
    readLocalText(file),
    readFile(join(repoRoot, libraryRelPath), 'utf-8')
  ])
  const normLocal = normalize(localRaw, { libraryNames })
  const normLib = normalize(libRaw, { libraryNames })
  return {
    localPath: file.relPath,
    owningSkill,
    isSymlink: file.isSymlink,
    status: normLocal === normLib ? 'unchanged' : 'drift'
  }
}


