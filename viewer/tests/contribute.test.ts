import { describe, it, expect } from 'vitest'
import {
  convertToLibrary,
  kebabCase,
  bumpPatch,
  changelogEntry,
  insertChangelogEntry
} from '../server/utils/contribute'
import type { FileKind } from '../shared/types'

const LIBRARY_KINDS = new Map<string, FileKind>([
  ['org-context', 'KNOWLEDGE'],
  ['git-conventions', 'KNOWLEDGE'],
  ['quill-agent', 'AGENT'],
  ['encounter-tuner', 'SKILL']
])

// A local Claude Code skill as setup.sh would project it: platform preamble,
// separator, then the skill file — plus platform-specific syntax in the body.
const LOCAL_WITH_PREAMBLE = `# skillset — Claude Code conventions

When a skill says "Dispatch to", use the Agent tool.

---

---
name: campaign-brief
description: Draft marketing campaign briefs from a product one-pager and audience notes.
---

# Campaign Brief

Load /Users/someone/skillset/KNOWLEDGE/org-context.md for org context.
Dispatch via Agent("quill-agent", query) for metrics.

Keep briefs under one page.
`

// A hand-written claude.ai-style skill (no preamble, minimal frontmatter).
const LOCAL_BARE = `---
name: Tone Checker
description: Reviews copy against Gladewick brand voice and suggests edits.
---

# Tone Checker

Compare drafts against the brand voice. Use \`[[org-context]]\` if available.
`

const LIBRARY_FILE = `---
name: campaign-brief
type: SKILL
description: Draft marketing campaign briefs.
knowledge:
  - "[[org-context]]"
agents: []
mcp: []
triggers:
  - "draft a campaign brief"
---

# Campaign Brief

Old body.
`

describe('kebabCase', () => {
  it('normalizes names', () => {
    expect(kebabCase('Tone Checker')).toBe('tone-checker')
    expect(kebabCase('  My_Cool  Skill!! ')).toBe('my-cool-skill')
    expect(kebabCase('already-kebab')).toBe('already-kebab')
  })
})

describe('convertToLibrary — new skill', () => {
  const result = convertToLibrary({
    name: 'campaign-brief',
    kind: 'SKILL',
    localContent: LOCAL_WITH_PREAMBLE,
    libraryContent: null,
    libraryKinds: LIBRARY_KINDS
  })

  it('targets SKILLS/ with the kebab name', () => {
    expect(result.isNew).toBe(true)
    expect(result.name).toBe('campaign-brief')
    expect(result.targetPath).toBe('SKILLS/campaign-brief.md')
  })

  it('strips the platform preamble', () => {
    expect(result.content).not.toContain('Claude Code conventions')
    expect(result.content).toContain('# Campaign Brief')
  })

  it('rewrites platform syntax to neutral [[link]] language', () => {
    expect(result.content).not.toContain('Agent(')
    expect(result.content).not.toContain('/Users/')
    expect(result.content).toContain('Dispatch to [[quill-agent]]')
    expect(result.content).toContain('[[org-context]]')
  })

  it('builds skillset frontmatter with classified links', () => {
    expect(result.content).toMatch(/^---\nname: campaign-brief\ntype: SKILL\n/)
    expect(result.content).toContain('knowledge:\n  - "[[org-context]]"')
    expect(result.content).toContain('agents:\n  - "[[quill-agent]]"')
    expect(result.content).toContain('mcp: []')
    expect(result.content).toContain('triggers: []')
  })

  it('carries the local description over', () => {
    expect(result.content).toContain('Draft marketing campaign briefs')
  })
})

describe('convertToLibrary — bare claude.ai-style skill', () => {
  const result = convertToLibrary({
    name: 'tone-checker',
    kind: 'SKILL',
    localContent: LOCAL_BARE,
    libraryContent: null,
    libraryKinds: LIBRARY_KINDS
  })

  it('kebab-cases the frontmatter name', () => {
    expect(result.name).toBe('tone-checker')
    expect(result.targetPath).toBe('SKILLS/tone-checker.md')
  })

  it('unwraps backticked wikilinks and classifies them', () => {
    expect(result.content).toContain('knowledge:\n  - "[[org-context]]"')
    expect(result.content).not.toContain('`[[org-context]]`')
  })
})

describe('convertToLibrary — update of an existing library file', () => {
  const result = convertToLibrary({
    name: 'campaign-brief',
    kind: 'SKILL',
    localContent: LOCAL_WITH_PREAMBLE,
    libraryContent: LIBRARY_FILE,
    libraryKinds: LIBRARY_KINDS
  })

  it('keeps the library frontmatter verbatim', () => {
    expect(result.isNew).toBe(false)
    expect(result.content).toContain('triggers:\n  - "draft a campaign brief"')
    expect(result.content).toMatch(/^---\nname: campaign-brief\ntype: SKILL\n/)
  })

  it('replaces the body with the converted local body', () => {
    expect(result.content).not.toContain('Old body.')
    expect(result.content).toContain('Keep briefs under one page.')
    expect(result.content).toContain('Dispatch to [[quill-agent]]')
  })
})

describe('version + changelog helpers', () => {
  it('bumps patch version', () => {
    expect(bumpPatch('0.2.5')).toBe('0.2.6')
    expect(bumpPatch('1.9.19\n')).toBe('1.9.20')
    expect(() => bumpPatch('not-semver')).toThrow()
  })

  it('formats changelog entries in house style', () => {
    const result = convertToLibrary({
      name: 'tone-checker',
      kind: 'SKILL',
      localContent: LOCAL_BARE,
      libraryContent: null,
      libraryKinds: LIBRARY_KINDS
    })
    const entry = changelogEntry('0.2.6', '2026-07-04', result)
    expect(entry).toContain('## 0.2.6 — 2026-07-04')
    expect(entry).toContain('### New Skills')
    expect(entry).toContain('- tone-checker — Reviews copy against Gladewick brand voice')
  })

  it('inserts entries directly under the # Changelog heading', () => {
    const existing = '# Changelog\n\n## 0.2.5 — 2026-05-20\n\n### Updated Skills\n- pr-builder — something\n'
    const updated = insertChangelogEntry(existing, '## 0.2.6 — 2026-07-04\n\n### New Skills\n- x — y\n')
    const idx26 = updated.indexOf('## 0.2.6')
    const idx25 = updated.indexOf('## 0.2.5')
    expect(idx26).toBeGreaterThan(-1)
    expect(idx25).toBeGreaterThan(idx26)
    expect(updated.startsWith('# Changelog\n\n## 0.2.6')).toBe(true)
  })
})
