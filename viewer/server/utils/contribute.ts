/**
 * Deterministic local (~/.claude) → library (SKILLS/ AGENTS/) format conversion,
 * plus VERSION/CHANGELOG bookkeeping, for the "Submit for review" flow.
 *
 * Body conversion reuses `normalize()` from driftNormalize — the same rules the
 * drift diff uses to ignore format noise (preamble strip, Agent() → Dispatch to
 * [[name]], absolute paths → [[links]]), so what you see in the diff is what
 * gets proposed.
 */

import matter from 'gray-matter'
import { normalize, extractFrontmatter } from './driftNormalize'
import type { DriftKind, FileKind, FrontmatterOverrides } from '../../shared/types'

const LINK_RE = /\[\[([a-z0-9-]+)\]\]/g
const PLACEHOLDER_LINKS = new Set(['link', 'links', 'wiki-links'])

export interface ConversionInput {
  /** Local item name (directory / file stem in ~/.claude). */
  name: string
  kind: DriftKind
  /** Raw content of the local SKILL.md / agent .md. */
  localContent: string
  /** Raw library file content when the item already exists there, else null. */
  libraryContent: string | null
  /** name → kind for every library file, used to classify [[links]]. */
  libraryKinds: Map<string, FileKind>
  /** Contributor-set frontmatter for new skills (teams, description, triggers). */
  overrides?: FrontmatterOverrides
}

export interface ConversionResult {
  /** Final kebab-cased name (== target filename stem). */
  name: string
  /** e.g. "SKILLS/my-skill.md" */
  targetPath: string
  /** Full converted file content. */
  content: string
  isNew: boolean
  kind: DriftKind
  /** One-line description used for the changelog entry. */
  description: string
}

export function kebabCase(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Wrap text into lines of at most `width` chars (word boundaries). */
function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > width) {
      lines.push(cur)
      cur = w
    } else {
      cur = cur ? cur + ' ' + w : w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function emitDescription(desc: string): string {
  const clean = desc.replace(/\s+/g, ' ').trim()
  if (clean.length <= 80 && !clean.includes(': ') && !clean.includes('#')) {
    return `description: ${clean}\n`
  }
  return 'description: >\n' + wrap(clean, 88).map((l) => `  ${l}`).join('\n') + '\n'
}

function emitList(key: string, items: string[], asLinks: boolean): string {
  if (items.length === 0) return `${key}: []\n`
  return (
    `${key}:\n` +
    items.map((i) => (asLinks ? `  - "[[${i}]]"` : `  - ${JSON.stringify(i)}`)).join('\n') +
    '\n'
  )
}

/** Collect resolvable [[links]] from a converted body, classified by kind. */
function classifyLinks(body: string, selfName: string, libraryKinds: Map<string, FileKind>) {
  const knowledge = new Set<string>()
  const agents = new Set<string>()
  for (const m of body.matchAll(LINK_RE)) {
    const ref = m[1]
    if (PLACEHOLDER_LINKS.has(ref) || ref === selfName) continue
    const kind = libraryKinds.get(ref)
    if (kind === 'KNOWLEDGE') knowledge.add(ref)
    else if (kind === 'AGENT') agents.add(ref)
  }
  return { knowledge: [...knowledge].sort(), agents: [...agents].sort() }
}

/**
 * setup.sh projects skills as "<preamble>\n\n---\n\n<skill file>". Skip past
 * that separator (same signature driftNormalize keys on) so gray-matter sees
 * the skill's own frontmatter, not the preamble text.
 */
function skillSource(text: string): string {
  const sepMatch = text.match(/\n---\n\s*\n(?=---\n)/)
  if (sepMatch && sepMatch.index !== undefined) {
    return text.slice(sepMatch.index + sepMatch[0].length)
  }
  return text
}

export function convertToLibrary(input: ConversionInput): ConversionResult {
  const { kind, localContent, libraryContent, libraryKinds } = input
  const libraryNames = new Set(libraryKinds.keys())
  const folder = kind === 'SKILL' ? 'SKILLS' : 'AGENTS'

  // Converted, format-noise-free body (preamble/frontmatter stripped,
  // platform syntax rewritten to neutral [[link]] language).
  const body = normalize(localContent, { libraryNames })

  if (libraryContent !== null) {
    // Update: keep the library file's frontmatter verbatim, swap the body.
    const fm = extractFrontmatter(libraryContent)
    const parsed = matter(libraryContent)
    const description =
      typeof parsed.data?.description === 'string' ? parsed.data.description.replace(/\s+/g, ' ').trim() : ''
    const name = typeof parsed.data?.name === 'string' ? parsed.data.name : kebabCase(input.name)
    return {
      name,
      targetPath: `${folder}/${name}.md`,
      content: fm + '\n' + body,
      isNew: false,
      kind,
      description
    }
  }

  // New file: build skillset frontmatter from the local one.
  const parsed = matter(skillSource(localContent))
  const name = kebabCase(typeof parsed.data?.name === 'string' ? parsed.data.name : input.name)
  const description =
    input.overrides?.description?.trim() ||
    (typeof parsed.data?.description === 'string'
      ? parsed.data.description.replace(/\s+/g, ' ').trim()
      : `${name} (imported from a local ${kind.toLowerCase()})`)
  const { knowledge, agents } = classifyLinks(body, name, libraryKinds)

  let fm = '---\n'
  fm += `name: ${name}\n`
  fm += `type: ${kind}\n`
  fm += emitDescription(description)
  if (kind === 'SKILL') {
    fm += emitList('teams', input.overrides?.teams ?? [], false)
  }
  fm += emitList('knowledge', knowledge, true)
  if (kind === 'SKILL') {
    fm += emitList('agents', agents, true)
  }
  fm += emitList('mcp', [], false)
  if (kind === 'SKILL') {
    fm += emitList('triggers', input.overrides?.triggers ?? [], false)
  }
  fm += '---\n'

  return {
    name,
    targetPath: `${folder}/${name}.md`,
    content: fm + '\n' + body,
    isNew: true,
    kind,
    description
  }
}

// ---------------------------------------------------------------------------
// VERSION / CHANGELOG bookkeeping
// ---------------------------------------------------------------------------

export function bumpPatch(version: string): string {
  const m = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!m) throw new Error(`VERSION is not valid semver: ${version.trim()}`)
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`
}

/** Build a changelog entry block matching the existing CHANGELOG.md style. */
export function changelogEntry(version: string, dateISO: string, result: ConversionResult): string {
  const section = result.isNew
    ? result.kind === 'SKILL' ? 'New Skills' : 'New Agents'
    : result.kind === 'SKILL' ? 'Updated Skills' : 'Updated Agents'
  const line = result.isNew
    ? `- ${result.name} — ${result.description || 'submitted from the viewer'}`
    : `- ${result.name} — updated from a local iteration (submitted via the viewer)`
  return `## ${version} — ${dateISO}\n\n### ${section}\n${line}\n`
}

/** Insert an entry directly under the "# Changelog" heading. */
export function insertChangelogEntry(changelog: string, entry: string): string {
  const lines = changelog.split('\n')
  const headingIdx = lines.findIndex((l) => l.startsWith('# '))
  if (headingIdx === -1) return entry + '\n' + changelog
  const before = lines.slice(0, headingIdx + 1).join('\n')
  const after = lines.slice(headingIdx + 1).join('\n').replace(/^\n+/, '')
  return `${before}\n\n${entry}\n${after}`
}
