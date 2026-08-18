import { describe, it, expect } from 'vitest'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { loadLibrary } from '../server/utils/library'
import { classifyLocalPath } from '../server/utils/driftShared'
import { computeDriftFromFiles } from '../server/utils/driftFromFiles'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('classifyLocalPath', () => {
  it('recognizes the three install shapes and ignores the rest', () => {
    expect(classifyLocalPath('skills/meta/SKILL.md')).toEqual({ kind: 'SKILL', name: 'meta' })
    expect(classifyLocalPath('skills/foo/agents/bar.md')).toEqual({ kind: 'AGENT', name: 'bar', owningSkill: 'foo' })
    expect(classifyLocalPath('agents/baz.md')).toEqual({ kind: 'AGENT', name: 'baz', owningSkill: null })
    expect(classifyLocalPath('KNOWLEDGE/org-context.md')).toBeNull()
    expect(classifyLocalPath('skills/foo/references/x.md')).toBeNull()
  })

  it('is tolerant of the picker rooted at ~/.claude/skills (no skills/ prefix)', () => {
    expect(classifyLocalPath('meta/SKILL.md')).toEqual({ kind: 'SKILL', name: 'meta' })
    expect(classifyLocalPath('foo/agents/bar.md')).toEqual({ kind: 'AGENT', name: 'bar', owningSkill: 'foo' })
  })
})

describe('computeDriftFromFiles', () => {
  it('classifies unchanged, drift, local-only and library-only', async () => {
    const library = await loadLibrary(REPO_ROOT)
    const aSkill = library.find((f) => f.kind === 'SKILL')!
    const raw = await readFile(join(REPO_ROOT, aSkill.path), 'utf-8')

    const items = await computeDriftFromFiles(
      [
        { path: `skills/${aSkill.name}/SKILL.md`, content: raw },              // identical → unchanged
        { path: 'skills/totally-made-up/SKILL.md', content: '# hi\n' }         // no library match → local-only
      ],
      library,
      REPO_ROOT
    )
    const byName = new Map(items.map((i) => [i.name, i]))

    expect(byName.get(aSkill.name)?.status).toBe('unchanged')
    expect(byName.get('totally-made-up')?.status).toBe('local-only')
    // A different real skill we didn't supply locally → library-only
    const other = library.find((f) => f.kind === 'SKILL' && f.name !== aSkill.name)!
    expect(byName.get(other.name)?.status).toBe('library-only')

    // Same skill with modified content → drift
    const drifted = await computeDriftFromFiles(
      [{ path: `skills/${aSkill.name}/SKILL.md`, content: raw + '\n\nlocal edit\n' }],
      library,
      REPO_ROOT
    )
    expect(drifted.find((i) => i.name === aSkill.name)?.status).toBe('drift')

    // Library-matched items carry their teams frontmatter (local-only don't).
    expect(items.filter((i) => i.libraryPath).every((i) => Array.isArray(i.teams))).toBe(true)
    expect(items.some((i) => (i.teams?.length ?? 0) > 0)).toBe(true)
  })
})
