import { readFile, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import matter from 'gray-matter'
import type { FileKind, LibraryFile } from '../../shared/types'

const DIRS: Array<{ dir: string; kind: FileKind }> = [
  { dir: 'SKILLS', kind: 'SKILL' },
  { dir: 'AGENTS', kind: 'AGENT' },
  { dir: 'KNOWLEDGE', kind: 'KNOWLEDGE' }
]

const LINK_RE = /\[\[([a-z0-9-]+)\]\]/g

// Generic placeholder names used in meta-documentation to refer to the link
// syntax itself rather than a real file (e.g. "rewrite paths to `[[link]]`").
// Filtered out by name so legitimate wikilinks inside backticks still count.
const PLACEHOLDER_LINKS = new Set(['link', 'links', 'wiki-links'])

async function readDirSafe(dir: string): Promise<string[]> {
  try {
    return await readdir(dir)
  } catch {
    return []
  }
}

export async function loadLibrary(repoRoot: string): Promise<LibraryFile[]> {
  const all: LibraryFile[] = []
  const byName = new Map<string, FileKind>()

  // First pass: build name → kind map so links can be resolved
  for (const { dir, kind } of DIRS) {
    const entries = await readDirSafe(join(repoRoot, dir))
    for (const f of entries) {
      if (!f.endsWith('.md')) continue
      byName.set(basename(f, '.md'), kind)
    }
  }

  // Second pass: parse each file
  for (const { dir, kind } of DIRS) {
    const dirPath = join(repoRoot, dir)
    const entries = await readDirSafe(dirPath)
    for (const f of entries) {
      if (!f.endsWith('.md')) continue
      const name = basename(f, '.md')
      const raw = await readFile(join(dirPath, f), 'utf-8')
      const parsed = matter(raw)
      const fm = parsed.data || {}

      // Collect links from frontmatter (knowledge:, agents:) and body
      const linkNames = new Set<string>()
      for (const key of ['knowledge', 'agents']) {
        const arr = fm[key]
        if (Array.isArray(arr)) {
          for (const item of arr) {
            const m = String(item).match(/^\[\[([a-z0-9-]+)\]\]$/)
            if (m) linkNames.add(m[1])
            else if (typeof item === 'string') linkNames.add(item)
          }
        }
      }
      for (const m of parsed.content.matchAll(LINK_RE)) {
        if (PLACEHOLDER_LINKS.has(m[1])) continue
        linkNames.add(m[1])
      }
      linkNames.delete(name) // ignore self-references

      const links = [...linkNames].map((linkName) => {
        const linkKind = byName.get(linkName) ?? null
        const dirForKind =
          linkKind === 'SKILL' ? 'SKILLS' : linkKind === 'AGENT' ? 'AGENTS' : linkKind === 'KNOWLEDGE' ? 'KNOWLEDGE' : null
        return {
          name: linkName,
          kind: linkKind,
          path: dirForKind ? `${dirForKind}/${linkName}.md` : null
        }
      })

      all.push({
        name,
        kind,
        path: `${dir}/${f}`,
        description: typeof fm.description === 'string' ? fm.description.trim() : undefined,
        teams: Array.isArray(fm.teams) ? fm.teams.map((t: unknown) => String(t)) : [],
        frontmatter: fm,
        links,
        bodyLength: parsed.content.length
      })
    }
  }

  return all
}
