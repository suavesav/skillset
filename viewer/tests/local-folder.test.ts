import { describe, it, expect } from 'vitest'
import { relativizeInputPath, isMarkdown } from '../composables/useLocalFolder'

describe('relativizeInputPath', () => {
  it('strips the root segment webkitdirectory prepends', () => {
    expect(relativizeInputPath('.claude/skills/meta/SKILL.md')).toBe('skills/meta/SKILL.md')
    expect(relativizeInputPath('root/agents/foo.md')).toBe('agents/foo.md')
  })

  it('leaves a single-segment path untouched', () => {
    expect(relativizeInputPath('SKILL.md')).toBe('SKILL.md')
  })
})

describe('isMarkdown', () => {
  it('matches .md case-insensitively', () => {
    expect(isMarkdown('SKILL.md')).toBe(true)
    expect(isMarkdown('README.MD')).toBe(true)
  })
  it('rejects non-markdown', () => {
    expect(isMarkdown('data.json')).toBe(false)
    expect(isMarkdown('notes.md.bak')).toBe(false)
  })
})
