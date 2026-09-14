import { describe, it, expect } from 'vitest'
import { searchIndex } from '../shared/search'
import type { SearchIndexEntry } from '../shared/types'

const ENTRIES: SearchIndexEntry[] = [
  {
    name: 'encounter-tuner',
    path: 'SKILLS/encounter-tuner.md',
    kind: 'SKILL',
    content: '---\nname: encounter-tuner\n---\n\nTunes encounters.\n'
  },
  {
    name: 'loot-math',
    path: 'KNOWLEDGE/loot-math.md',
    kind: 'KNOWLEDGE',
    content: '---\nname: loot-math\n---\n\nDrop tables.\n'
  },
  {
    name: 'quill-agent',
    path: 'AGENTS/quill-agent.md',
    kind: 'AGENT',
    // Padded either side so the excerpt is cut at both ends.
    content: 'x'.repeat(200) + '\n  the   ENCOUNTER   budget  \n' + 'y'.repeat(200)
  }
]

describe('searchIndex', () => {
  it('returns nothing for an empty or whitespace query', () => {
    expect(searchIndex(ENTRIES, '')).toEqual([])
    expect(searchIndex(ENTRIES, '   ')).toEqual([])
  })

  it('matches names case-insensitively', () => {
    const matches = searchIndex(ENTRIES, 'ENCOUNTER-TUN')
    expect(matches.map((m) => m.name)).toEqual(['encounter-tuner'])
    expect(matches[0].matchType).toBe('name')
  })

  it('does not repeat a name match as a body match', () => {
    // "encounter-tuner" is in its own frontmatter, so a naive body pass would
    // list it twice.
    const matches = searchIndex(ENTRIES, 'encounter-tuner')
    expect(matches.filter((m) => m.name === 'encounter-tuner').length).toBe(1)
  })

  it('excerpts body matches with ellipses and collapsed whitespace', () => {
    const match = searchIndex(ENTRIES, 'encounter').find((m) => m.name === 'quill-agent')!
    expect(match.matchType).toBe('body')
    expect(match.excerpt!.startsWith('…')).toBe(true)
    expect(match.excerpt!.endsWith('…')).toBe(true)
    expect(match.excerpt).toContain('the ENCOUNTER budget')
    expect(match.excerpt).not.toMatch(/\s\s/)
  })

  it('puts every name match before every body match', () => {
    const matches = searchIndex(ENTRIES, 'encounter')
    const kinds = matches.map((m) => m.matchType)
    expect(kinds).toEqual(['name', 'body'])
    expect(matches[0].name).toBe('encounter-tuner')
  })

  it('sorts name matches by where the match starts, then alphabetically', () => {
    const entries: SearchIndexEntry[] = [
      { name: 'z-loot', path: 'KNOWLEDGE/z-loot.md', kind: 'KNOWLEDGE', content: '' },
      { name: 'a-loot', path: 'KNOWLEDGE/a-loot.md', kind: 'KNOWLEDGE', content: '' },
      { name: 'loot-math', path: 'KNOWLEDGE/loot-math.md', kind: 'KNOWLEDGE', content: '' }
    ]
    expect(searchIndex(entries, 'loot').map((m) => m.name)).toEqual(['loot-math', 'a-loot', 'z-loot'])
  })
})
