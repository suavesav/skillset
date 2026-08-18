/**
 * Normalizes a skill or agent markdown body so that local (~/.claude) and
 * library (SKILLS/ AGENTS/) versions can be diffed for *real* drift without
 * format-conversion noise.
 *
 * Rules mirror what `meta push` ignores when deciding whether a skill changed:
 *   - YAML frontmatter is stripped entirely (the two formats are known to differ)
 *   - Platform preamble (everything before the first leading `# ` heading) dropped
 *   - `Agent("name", ...)` blocks → `Dispatch to [[name]]`
 *   - Absolute paths to known library files → `[[name]]`
 *   - Whitespace collapsed
 */

const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n?/

export interface NormalizeOptions {
  /** Library file names — used to rewrite absolute paths to `[[name]]`. */
  libraryNames?: Set<string>
}

export function stripFrontmatter(text: string): string {
  const m = text.match(FRONTMATTER_RE)
  return m ? text.slice(m[0].length) : text
}

export function extractFrontmatter(text: string): string {
  const m = text.match(FRONTMATTER_RE)
  return m ? m[0] : ''
}

/**
 * Some local SKILL.md files have a platform preamble prepended before the
 * actual skill body. setup.sh inserts a `---` separator after the preamble.
 * We can't reliably tell preamble from real frontmatter just by markers, so we
 * use a heuristic: if the file starts with `---` followed by another `---`
 * within the first 200 lines, and *then* another `---...---` block, the first
 * block is the preamble's own frontmatter and the second is the skill's.
 *
 * Simpler safe approach: strip *all* leading `---...---` blocks. That handles
 * preamble-with-frontmatter, library files, and bare-body files alike.
 */
export function stripAllLeadingFrontmatter(text: string): string {
  let cur = text
  // If the file has a platform preamble prepended (setup.sh writes
  // "<preamble>\n\n---\n\n<library file>"), drop everything before the
  // library file's own frontmatter. The signature is a `---` separator line
  // followed by a blank line followed by another `---` (the library
  // frontmatter opener).
  const sepMatch = cur.match(/\n---\n\s*\n(?=---\n)/)
  if (sepMatch && sepMatch.index !== undefined) {
    cur = cur.slice(sepMatch.index + sepMatch[0].length)
  }
  while (FRONTMATTER_RE.test(cur)) {
    cur = stripFrontmatter(cur)
    cur = cur.replace(/^\s*\n/, '')
  }
  return cur
}

export function normalize(text: string, opts: NormalizeOptions = {}): string {
  let t = stripAllLeadingFrontmatter(text)

  // Agent("name", ...) → Dispatch to [[name]]
  t = t.replace(/Agent\(\s*["']([a-z0-9-]+)["'][\s\S]*?\)/g, 'Dispatch to [[$1]]')

  // Absolute paths to known library files → [[name]]
  if (opts.libraryNames && opts.libraryNames.size > 0) {
    const names = [...opts.libraryNames].sort((a, b) => b.length - a.length)
    for (const name of names) {
      // Match <anything>/<name>.md as path-style refs
      const re = new RegExp(`(?:[\\w./~-]+/)?${escapeRegExp(name)}\\.md`, 'g')
      t = t.replace(re, `[[${name}]]`)
    }
  }

  // `[[name]]` → [[name]]  (older local SKILL.md files wrap wikilinks (or paths
  // that the previous step just converted to wikilinks) in backticks. Run AFTER
  // path normalization so we catch `[[name]]` that came from `path/name.md`.)
  t = t.replace(/`(\[\[[a-z0-9-]+\]\])`/g, '$1')

  // Collapse trailing whitespace on each line
  t = t.replace(/[ \t]+$/gm, '')
  // Collapse 3+ blank lines down to 2
  t = t.replace(/\n{3,}/g, '\n\n')
  // Trim leading/trailing whitespace overall
  t = t.trim() + '\n'

  return t
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
