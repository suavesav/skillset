import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadLibrary } from '../server/utils/library'
import { project } from '../server/utils/projections'
import { buildTree, formatBytes, type TreeNodeData } from '../shared/tree'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function find(nodes: TreeNodeData[], name: string): TreeNodeData | undefined {
  for (const n of nodes) {
    if (n.name === name) return n
    const hit = n.children && find(n.children, name)
    if (hit) return hit
  }
  return undefined
}

function flatten(nodes: TreeNodeData[]): TreeNodeData[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flatten(n.children) : [])])
}

describe('buildTree', () => {
  it('nests projected paths into directories', () => {
    const tree = buildTree([
      { projectedPath: 'skills/encounter-tuner/SKILL.md', sourcePath: 'SKILLS/encounter-tuner.md' },
      { projectedPath: 'skills/encounter-tuner/references/loot-math.md', sourcePath: 'KNOWLEDGE/loot-math.md' },
      { projectedPath: 'agents/quill-agent.md', sourcePath: 'AGENTS/quill-agent.md' }
    ])
    const skills = find(tree, 'skills')!
    expect(skills.kind).toBe('dir')
    expect(find(tree, 'SKILL.md')!.kind).toBe('file')
    // skills sorts before agents (intent order, not alphabetical)
    expect(tree.map((n) => n.name)).toEqual(['skills', 'agents'])
  })

  it('sorts compiled artifacts above directories and copied files', () => {
    const tree = buildTree([
      { projectedPath: '.skillset/studio-context.md', sourcePath: 'KNOWLEDGE/studio-context.md' },
      { projectedPath: '.skillset/loot-math.md', sourcePath: 'KNOWLEDGE/loot-math.md' },
      { projectedPath: 'AGENTS.md', sourcePath: null, synthesized: true, inputs: ['SKILLS/a.md'] }
    ])
    // Must not sort below the copied knowledge files, where it lands off-screen.
    expect(tree.map((n) => n.name)).toEqual(['AGENTS.md', '.skillset'])
  })

  it('expands a synthesized bundle into input groups', () => {
    const tree = buildTree([
      {
        projectedPath: 'AGENTS.md',
        sourcePath: null,
        synthesized: true,
        inputs: [
          'platforms/codex/preamble.md',
          'SKILLS/encounter-tuner.md',
          'SKILLS/bark-writer.md',
          'AGENTS/quill-agent.md'
        ]
      }
    ])
    const bundle = tree[0]
    expect(bundle.kind).toBe('file')
    expect(bundle.inputCount).toBe(4)

    // Grouped by source folder, in first-seen (concatenation) order.
    expect(bundle.children!.map((g) => g.name)).toEqual(['from platforms/', 'from SKILLS/', 'from AGENTS/'])
    const skillsGroup = bundle.children![1]
    expect(skillsGroup.kind).toBe('bundle-input-group')
    // Concatenation order is preserved inside a group.
    expect(skillsGroup.children!.map((c) => c.name)).toEqual(['encounter-tuner.md', 'bark-writer.md'])
    expect(skillsGroup.children![0].kind).toBe('bundle-input')
    expect(skillsGroup.children![0].path).toBe('SKILLS/encounter-tuner.md')
  })

  it('filters bundle inputs through the team closure', () => {
    const entries = [
      {
        projectedPath: 'AGENTS.md',
        sourcePath: null,
        synthesized: true,
        inputs: ['SKILLS/encounter-tuner.md', 'SKILLS/git-workflow.md', 'AGENTS/quill-agent.md']
      }
    ]
    const keep = (p: string) => p !== 'SKILLS/git-workflow.md'
    const bundle = buildTree(entries, { keepInput: keep })[0]
    expect(bundle.inputCount).toBe(2)
    expect(flatten(bundle.children!).map((n) => n.path)).not.toContain('SKILLS/git-workflow.md')
  })

  it('leaves inputCount unset when the closure filters every input out', () => {
    const bundle = buildTree(
      [{ projectedPath: 'AGENTS.md', sourcePath: null, synthesized: true, inputs: ['SKILLS/a.md'] }],
      { keepInput: () => false }
    )[0]
    expect(bundle.inputCount).toBeUndefined()
    expect(bundle.children).toBeUndefined()
  })

  it('input groups are not addressable, so no projected path can select one', () => {
    // Projected paths crafted to look exactly like a group label.
    const entries = [
      { projectedPath: 'AGENTS.md', sourcePath: null, synthesized: true, inputs: ['SKILLS/a.md'] },
      { projectedPath: 'group:SKILLS', sourcePath: 'SKILLS/a.md' },
      { projectedPath: 'from SKILLS/', sourcePath: 'SKILLS/a.md' }
    ]
    const tree = buildTree(entries)
    const groups = flatten(tree).filter((n) => n.kind === 'bundle-input-group')
    expect(groups.length).toBe(1)
    // No path means the selected-path comparison can never match a group.
    for (const g of groups) expect(g.path).toBe('')
    // Keys only have to separate siblings — that is what Vue renders on.
    const siblingsUnique = (nodes: TreeNodeData[]): boolean =>
      nodes.every(
        (n, _, all) =>
          all.filter((o) => o.key === n.key).length === 1 &&
          (!n.children || siblingsUnique(n.children))
      )
    expect(siblingsUnique(tree)).toBe(true)
  })
})

describe('buildTree against real projections', () => {
  it('makes the codex bundle browsable instead of one opaque row', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('codex', REPO_ROOT, files)
    const tree = buildTree(entries)

    const agentsMd = find(tree, 'AGENTS.md')!
    const skills = files.filter((f) => f.kind === 'SKILL').length
    const agents = files.filter((f) => f.kind === 'AGENT').length
    expect(agentsMd.inputCount).toBe(skills + agents + 1)
    expect(agentsMd.children!.map((g) => g.name)).toContain('from SKILLS/')
    expect(agentsMd.children!.map((g) => g.name)).toContain('from AGENTS/')
  })

  it('shows every claude-plugin plugin, not just the umbrella', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('claude-plugin', REPO_ROOT, files)
    const plugins = find(buildTree(entries), 'plugins')!
    const names = plugins.children!.map((c) => c.name)
    expect(names).toContain('skillset-all')
    expect(names).toContain('skillset-liveops')
    expect(names).toContain('skillset-engineering')
    expect(names.length).toBeGreaterThan(3)
  })

  it('tree leaves and projection entries are the same set', async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const platform of ['codex', 'claude-plugin'] as const) {
      const entries = await project(platform, REPO_ROOT, files)
      const projected = entries.map((e) => e.projectedPath).sort()
      const leaves = flatten(buildTree(entries))
        .filter((n) => n.kind === 'file')
        .map((n) => n.path)
        .sort()
      // Both directions: leaf-only would stay green while buildTree silently
      // dropped an entry.
      expect(leaves, platform).toEqual(projected)
    }
  })

  it('does not drop an entry whose path is also a directory prefix', () => {
    // "a/b" and "a/b/c" together used to make one of them unreachable.
    for (const order of [['a/b', 'a/b/c'], ['a/b/c', 'a/b']]) {
      const tree = buildTree(order.map((p) => ({ projectedPath: p, sourcePath: null })))
      const leaves = flatten(tree).filter((n) => n.kind === 'file').map((n) => n.path).sort()
      expect(leaves, order.join(' then ')).toEqual(['a/b', 'a/b/c'])
    }
  })
})

describe('formatBytes', () => {
  it('scales units and drops nulls', () => {
    expect(formatBytes(null)).toBe('')
    expect(formatBytes(undefined)).toBe('')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(201972)).toBe('197 KB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})
