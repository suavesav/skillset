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
  /** Path relative to the repo root, e.g. "SKILLS/encounter-tuner.md" */
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
  /**
   * Sources concatenated into a synthesized file, in build order. Empty for 1:1
   * copies, where `sourcePath` already says it. See platforms/PROJECTION.md.
   */
  inputs?: string[]
}

export interface FilesResponse {
  repoRoot: string
  files: LibraryFile[]
}

export interface ProjectionResponse {
  platform: Platform
  entries: ProjectionEntry[]
}

export interface ProjectedFileResponse {
  platform: Platform
  /** The projected path that was compiled. */
  path: string
  /** Byte-identical to what a real build writes. */
  content: string
  bytes: number
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
  /** Path relative to claudeHome, e.g. "skills/encounter-tuner/SKILL.md" */
  localPath: string
  /** Which skill bundles this file (for skill-bundled agents). null for top-level. */
  owningSkill: string | null
  isSymlink: boolean
  status: DriftStatus
}

export interface DriftItem {
  name: string
  kind: DriftKind
  /** Path in the repo, e.g. "SKILLS/encounter-tuner.md". null for local-only. */
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
