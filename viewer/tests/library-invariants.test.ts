import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadLibrary } from '../server/utils/library'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('library invariants', () => {
  it('every file has frontmatter with a name and type', async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const f of files) {
      expect(f.frontmatter.name, `${f.path} missing frontmatter.name`).toBeTruthy()
      expect(f.frontmatter.type, `${f.path} missing frontmatter.type`).toBeTruthy()
    }
  })

  it("frontmatter.name matches the filename (without .md)", async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const f of files) {
      expect(
        f.frontmatter.name,
        `${f.path}: frontmatter.name "${f.frontmatter.name}" does not match filename "${f.name}"`
      ).toBe(f.name)
    }
  })

  it('frontmatter.type matches the directory the file lives in', async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const f of files) {
      expect(f.frontmatter.type, `${f.path} type mismatch`).toBe(f.kind)
    }
  })

  it('every link in a SKILL or AGENT file resolves to a real library file', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const known = new Set(files.map((f) => f.name))
    const dangling: string[] = []
    for (const f of files) {
      if (f.kind === 'KNOWLEDGE') continue // KNOWLEDGE files don't typically link out
      for (const link of f.links) {
        if (!known.has(link.name)) {
          dangling.push(`${f.path} → [[${link.name}]]`)
        }
      }
    }
    expect(dangling, `dangling links:\n  ${dangling.join('\n  ')}`).toEqual([])
  })
})
