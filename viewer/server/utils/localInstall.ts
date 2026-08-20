import { readFile, readdir, lstat, stat, realpath } from 'node:fs/promises'
import { join, basename, sep } from 'node:path'

export interface LocalSkillFile {
  /** Relative to claudeHome, e.g. "skills/encounter-tuner/SKILL.md" */
  relPath: string
  absPath: string
  isSymlink: boolean
  /** Resolved target if symlink, else null */
  symlinkTarget: string | null
  /** Whether the symlink resolves inside repoRoot */
  pointsIntoRepo: boolean
}

export interface LocalInventory {
  /** ~/.claude/skills/<name>/SKILL.md keyed by skill name */
  skills: Map<string, LocalSkillFile>
  /** ~/.claude/agents/<name>.md keyed by agent name */
  topAgents: Map<string, LocalSkillFile>
  /**
   * Skill-bundled agents at ~/.claude/skills/<skill>/agents/<agent>.md.
   * Keyed by agent name; each entry lists every (owningSkill, file) pair.
   */
  bundledAgents: Map<string, Array<{ owningSkill: string; file: LocalSkillFile }>>
  /** Skills present locally that have NO library counterpart yet (workspace dirs etc.) */
  localOnlySkillDirs: string[]
}

export async function loadLocalInventory(claudeHome: string, repoRoot: string): Promise<LocalInventory> {
  const skills = new Map<string, LocalSkillFile>()
  const topAgents = new Map<string, LocalSkillFile>()
  const bundledAgents = new Map<string, Array<{ owningSkill: string; file: LocalSkillFile }>>()
  const localOnlySkillDirs: string[] = []

  // Top-level agents directory: ~/.claude/agents/*.md
  const agentsDir = join(claudeHome, 'agents')
  for (const entry of await safeReaddir(agentsDir)) {
    if (!entry.endsWith('.md')) continue
    const file = await describe(join(agentsDir, entry), `agents/${entry}`, repoRoot)
    topAgents.set(basename(entry, '.md'), file)
  }

  // Per-skill dirs: ~/.claude/skills/<name>/
  const skillsDir = join(claudeHome, 'skills')
  for (const skillName of await safeReaddir(skillsDir)) {
    const skillDir = join(skillsDir, skillName)
    let dirStat
    try {
      // stat (not lstat) so symlinked skill dirs — e.g. ~/.claude/skills/lavish
      // pointing into ~/.agents/skills — resolve to their target and still count.
      dirStat = await stat(skillDir)
    } catch {
      continue // dangling symlink or unreadable entry
    }
    if (!dirStat.isDirectory()) continue

    // The skill folder itself may be a symlink (e.g. ~/.claude/skills/lavish →
    // ~/.agents/skills/lavish). SKILL.md below then reads as a regular file, so
    // capture the folder's link here to mark the whole skill as a shortcut.
    const dirLink = await describeLink(skillDir, repoRoot)

    // SKILL.md (the projected skill body)
    const skillMd = join(skillDir, 'SKILL.md')
    try {
      await lstat(skillMd)
      const file = await describe(skillMd, `skills/${skillName}/SKILL.md`, repoRoot)
      skills.set(skillName, mergeContainerLink(file, dirLink))
    } catch {
      // No SKILL.md — workspace-only dir; flag as local-only
      localOnlySkillDirs.push(skillName)
      continue
    }

    // Bundled agents at ~/.claude/skills/<name>/agents/
    const subAgentsDir = join(skillDir, 'agents')
    for (const f of await safeReaddir(subAgentsDir)) {
      if (!f.endsWith('.md')) continue
      const agentName = basename(f, '.md')
      const file = await describe(join(subAgentsDir, f), `skills/${skillName}/agents/${f}`, repoRoot)
      const arr = bundledAgents.get(agentName) ?? []
      arr.push({ owningSkill: skillName, file })
      bundledAgents.set(agentName, arr)
    }
  }

  return { skills, topAgents, bundledAgents, localOnlySkillDirs }
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir)
  } catch {
    return []
  }
}

async function describe(absPath: string, relPath: string, repoRoot: string): Promise<LocalSkillFile> {
  const stat = await lstat(absPath)
  const isSymlink = stat.isSymbolicLink()
  let symlinkTarget: string | null = null
  let pointsIntoRepo = false
  if (isSymlink) {
    try {
      symlinkTarget = await realpath(absPath)
      pointsIntoRepo = symlinkTarget.startsWith(repoRoot + sep) || symlinkTarget === repoRoot
    } catch {
      /* dangling symlink */
    }
  }
  return { relPath, absPath, isSymlink, symlinkTarget, pointsIntoRepo }
}

interface ContainerLink { isSymlink: boolean; target: string | null; pointsIntoRepo: boolean }

/** Describe whether a directory entry is itself a symlink, and where it points. */
async function describeLink(absPath: string, repoRoot: string): Promise<ContainerLink> {
  const st = await lstat(absPath)
  if (!st.isSymbolicLink()) return { isSymlink: false, target: null, pointsIntoRepo: false }
  try {
    const target = await realpath(absPath)
    return { isSymlink: true, target, pointsIntoRepo: target.startsWith(repoRoot + sep) || target === repoRoot }
  } catch {
    return { isSymlink: true, target: null, pointsIntoRepo: false }
  }
}

/** Fold a containing folder's symlink status into a file descriptor. */
function mergeContainerLink(file: LocalSkillFile, link: ContainerLink): LocalSkillFile {
  if (!link.isSymlink) return file
  return {
    ...file,
    isSymlink: true,
    symlinkTarget: file.symlinkTarget ?? link.target,
    pointsIntoRepo: file.pointsIntoRepo || link.pointsIntoRepo
  }
}

export async function readLocalText(file: LocalSkillFile): Promise<string> {
  return readFile(file.absPath, 'utf-8')
}
