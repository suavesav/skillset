// Shared types — imported by both server APIs and Vue components so they can't drift.

export type FileKind = 'SKILL' | 'AGENT' | 'KNOWLEDGE'

export interface LibraryLink {
  name: string
  kind: FileKind | null
  path: string | null
}

export interface LibraryFile {
  name: string
  kind: FileKind
  /** Path relative to the repo root, e.g. "SKILLS/le-analyst.md" */
  path: string
  description?: string
  /** Team bundles this file ships in (from the `teams:` frontmatter). Only meaningful for SKILLs; empty for AGENT/KNOWLEDGE. */
  teams: string[]
  frontmatter: Record<string, any>
  links: LibraryLink[]
  bodyLength: number
}

export type Platform = 'raw' | 'claude-code' | 'claude-plugin' | 'codex' | 'claude-desktop'

export const PLATFORMS: Platform[] = ['raw', 'claude-code', 'claude-plugin', 'codex', 'claude-desktop']

export interface ProjectionEntry {
  /** Where this file lives in the projected layout. */
  projectedPath: string
  /** Source file in the library. null for files synthesized from scratch (e.g. generated manifests). */
  sourcePath: string | null
  /** True when the projected file is built by concatenation/transformation rather than a 1:1 copy. */
  synthesized?: boolean
  /** Optional human-readable note shown in the UI. */
  note?: string
}

export interface FilesResponse {
  repoRoot: string
  files: LibraryFile[]
}

export interface ProjectionResponse {
  platform: Platform
  entries: ProjectionEntry[]
}

export interface FileResponse {
  path: string
  content: string
}

export interface SearchMatch {
  name: string
  path: string
  kind: FileKind
  matchType: 'name' | 'body'
  excerpt?: string
}

export interface SearchResponse {
  query: string
  matches: SearchMatch[]
}

export type DriftKind = 'SKILL' | 'AGENT'

export type DriftStatus =
  | 'synced'        // local file symlinked into the repo
  | 'unchanged'     // content equal after normalization
  | 'drift'         // local differs from library
  | 'local-only'    // exists locally, no library counterpart
  | 'library-only'  // exists in library, not installed locally
  | 'conflict'      // multiple local copies disagree

export interface LocalLocation {
  /** Path relative to claudeHome, e.g. "skills/le-analyst/SKILL.md" */
  localPath: string
  /** Which skill bundles this file (for skill-bundled agents). null for top-level. */
  owningSkill: string | null
  isSymlink: boolean
  status: DriftStatus
}

export interface DriftItem {
  name: string
  kind: DriftKind
  /** Path in the repo, e.g. "SKILLS/le-analyst.md". null for local-only. */
  libraryPath: string | null
  /** Aggregate status (worst-case across locations). */
  status: DriftStatus
  locations: LocalLocation[]
  /** Team bundles this item belongs to (from the library `teams:` frontmatter). */
  teams?: string[]
}

export interface DriftResponse {
  items: DriftItem[]
}

export type DiffViewMode = 'normalized' | 'raw' | 'frontmatter'

/** Frontmatter the contributor can set when submitting a NEW skill. */
export interface FrontmatterOverrides {
  teams?: string[]
  description?: string
  triggers?: string[]
}

export interface ContributeRequest {
  name: string
  kind: DriftKind
  /**
   * Relative path to the local file, e.g. "skills/my-skill/SKILL.md". Its base
   * depends on the mode: without `localContent` the server resolves it against
   * claudeHome; with `localContent` it is relative to the folder the user picked
   * in the browser (often ~/.claude/skills) and is used only as a label.
   */
  localPath: string
  /**
   * Local file content read by the browser. When present, the server uses it
   * directly instead of reading claudeHome (required in the hosted app).
   */
  localContent?: string
  /** Contributor-set frontmatter for new skills (teams, description, triggers). */
  overrides?: FrontmatterOverrides
  /**
   * Optional self-reported GitHub handle of the submitter. PRs are authored by
   * the neutral `skillset[bot]` identity, so this is the only attribution the
   * reviewer gets; it is untrusted and rendered as plain text in the PR body.
   */
  submitter?: string
}

export interface ContributePreviewResponse {
  name: string
  kind: DriftKind
  isNew: boolean
  /** Where the file will land in the repo, e.g. "SKILLS/my-skill.md" */
  targetPath: string
  /** Full converted library-format file content. */
  converted: string
  /** Current library version of the file, null for new skills. */
  libraryContent: string | null
  /** Derived one-line description (seeds the editor for new skills). */
  description: string
  /** Validation errors from scripts/validate.py (empty = clean). */
  validationErrors: string[]
}

export interface ContributeSubmitResponse {
  prUrl: string
  branch: string
  /** True when an open PR for this item already existed (no new PR opened). */
  existing?: boolean
}

export interface DriftPairResponse {
  name: string
  kind: DriftKind
  libraryPath: string | null
  localPath: string
  libraryContent: string | null
  localContent: string
  /** Normalized text used for the default diff. */
  normalizedLibrary: string | null
  normalizedLocal: string
  isSymlink: boolean
  symlinkTarget?: string | null
}
