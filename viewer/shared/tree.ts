// Turning a flat projection into the tree the Files view renders.

import type { ProjectionEntry } from './types'

export type TreeNodeKind =
  | 'dir'                  // a real directory in the projected layout
  | 'file'                 // a projected file
  | 'bundle-input-group'   // "from SKILLS/" under a synthesized bundle
  | 'bundle-input'         // one library file compiled into that bundle

export interface TreeNodeData {
  name: string
  /**
   * Full projected path for files/dirs, library path for bundle inputs, empty
   * for input groups — a group has no address, so nothing can select one.
   */
  path: string
  /** Stable key for rendering. Unique among siblings. */
  key: string
  kind: TreeNodeKind
  sourcePath: string | null
  synthesized?: boolean
  note?: string
  /** Library files compiled into this file (synthesized bundles only). */
  inputCount?: number
  /** Child count, shown on directories and input groups. */
  count?: number
  children?: TreeNodeData[]
}

/** Category folders sort by intent; everything else alphabetically after. */
const CATEGORY_RANK: Record<string, number> = {
  skills: 0, agents: 1, _agents: 1, knowledge: 2, references: 2
}

function categoryRank(name: string): number {
  return CATEGORY_RANK[name.toLowerCase()] ?? 99
}

function basename(p: string): string {
  const i = p.lastIndexOf('/')
  return i === -1 ? p : p.slice(i + 1)
}

/** "SKILLS/encounter-tuner.md" -> "SKILLS" */
function inputGroup(path: string): string {
  const i = path.indexOf('/')
  return i === -1 ? path : path.slice(0, i)
}

/** Grouped by source folder, left in the reported (concatenation) order. */
function buildInputGroups(
  inputs: string[],
  keep: (sourcePath: string) => boolean
): TreeNodeData[] {
  const groups: TreeNodeData[] = []
  const byName = new Map<string, TreeNodeData>()
  for (const input of inputs) {
    if (!keep(input)) continue
    const label = inputGroup(input)
    let group = byName.get(label)
    if (!group) {
      group = {
        name: 'from ' + label + '/',
        path: '',
        key: 'group:' + label,
        kind: 'bundle-input-group',
        sourcePath: null,
        children: []
      }
      byName.set(label, group)
      groups.push(group)
    }
    group.children!.push({
      name: basename(input),
      path: input,
      key: 'input:' + input,
      kind: 'bundle-input',
      sourcePath: input
    })
  }
  for (const g of groups) g.count = g.children!.length
  return groups
}

export interface BuildTreeOptions {
  /** Team-closure test applied to bundle inputs. Defaults to keeping everything. */
  keepInput?: (sourcePath: string) => boolean
}

export function buildTree(
  entries: ProjectionEntry[],
  opts: BuildTreeOptions = {}
): TreeNodeData[] {
  const keepInput = opts.keepInput ?? (() => true)
  const root: TreeNodeData = { name: '', path: '', key: '', kind: 'dir', sourcePath: null, children: [] }

  for (const e of entries) {
    // Empty segments would render as unnamed nodes.
    const parts = e.projectedPath.split('/')
    if (parts.some((p) => !p)) continue
    let cur = root
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const isLeaf = i === parts.length - 1
      cur.children = cur.children || []
      // Kind too: "a/b" plus "a/b/c" would otherwise nest a dir under a file.
      const wantKind = isLeaf ? 'file' : 'dir'
      let next = cur.children.find((c) => c.name === name && c.kind === wantKind)
      if (!next) {
        next = isLeaf
          ? {
              name,
              path: e.projectedPath,
              key: e.projectedPath,
              kind: 'file',
              sourcePath: e.sourcePath,
              synthesized: e.synthesized,
              note: e.note
            }
          : {
              name,
              path: parts.slice(0, i + 1).join('/'),
              key: parts.slice(0, i + 1).join('/'),
              kind: 'dir',
              sourcePath: null,
              children: []
            }
        cur.children.push(next)
      }
      if (isLeaf && e.inputs?.length) {
        const groups = buildInputGroups(e.inputs, keepInput)
        const shown = groups.reduce((n, g) => n + (g.count ?? 0), 0)
        if (shown) {
          next.children = groups
          next.inputCount = shown
        }
      }
      cur = next
    }
  }

  countAndSort(root)
  return root.children || []
}

function countAndSort(node: TreeNodeData) {
  if (!node.children) return
  if (node.kind === 'dir') {
    node.children.sort((a, b) => {
      // Compiled first: codex's lone AGENTS.md otherwise sorts off-screen.
      const aSynth = a.kind === 'file' && !!a.synthesized
      const bSynth = b.kind === 'file' && !!b.synthesized
      if (aSynth !== bSynth) return aSynth ? -1 : 1
      const aDir = a.kind === 'dir'
      const bDir = b.kind === 'dir'
      if (aDir !== bDir) return aDir ? -1 : 1
      const ra = categoryRank(a.name)
      const rb = categoryRank(b.name)
      if (ra !== rb) return ra - rb
      return a.name.localeCompare(b.name)
    })
    if (node.path) node.count = countFiles(node)
  }
  for (const c of node.children) countAndSort(c)
}

/** Projected files at or below this node. Bundle inputs are not files. */
function countFiles(node: TreeNodeData): number {
  if (node.kind === 'file') return 1
  if (node.kind !== 'dir') return 0
  return (node.children || []).reduce((n, c) => n + countFiles(c), 0)
}

export function formatBytes(n: number | null | undefined): string {
  if (n == null) return ''
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
}
