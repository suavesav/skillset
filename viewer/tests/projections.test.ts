import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadLibrary } from '../server/utils/library'
import { project } from '../server/utils/projections'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('project()', () => {
  it('raw is the identity mapping over the library', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('raw', REPO_ROOT, files)
    expect(entries.length).toBe(files.length)
    for (const e of entries) {
      expect(e.projectedPath).toBe(e.sourcePath)
    }
  })

  it('claude-code skips the meta skill', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('claude-code', REPO_ROOT, files)
    const skillFiles = entries.filter((e) => /^skills\/[^/]+\/SKILL\.md$/.test(e.projectedPath))
    const names = skillFiles.map((e) => e.projectedPath.split('/')[1])
    expect(names).not.toContain('meta')
  })

  it('claude-code includes references/ for each skill knowledge link', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('claude-code', REPO_ROOT, files)
    // encounter-tuner declares 2 knowledge files (encounter-tuning-model, telemetry-schema)
    const encounterTunerRefs = entries.filter((e) =>
      e.projectedPath.startsWith('skills/encounter-tuner/references/')
    )
    const refNames = encounterTunerRefs.map((e) => e.projectedPath.split('/').pop()!.replace('.md', ''))
    expect(refNames).toContain('encounter-tuning-model')
    expect(refNames).toContain('telemetry-schema')
  })

  it('claude-plugin skips meta and uses _agents/ prefix', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('claude-plugin', REPO_ROOT, files)
    expect(entries.some((e) => e.projectedPath.includes('/meta/'))).toBe(false)
    expect(entries.some((e) => e.projectedPath.startsWith('plugins/skillset-all/_agents/'))).toBe(true)
  })

  it('claude-plugin walks the transitive knowledge closure', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('claude-plugin', REPO_ROOT, files)
    const paths = entries.map((e) => e.projectedPath)
    // encounter-tuner references [[encounter-tuning-model]], which references
    // [[playtest-protocol]]. playtest-protocol is reachable only transitively, so its
    // presence proves --list walks the closure (not just direct links).
    expect(paths).toContain('plugins/skillset-all/skills/encounter-tuner/references/encounter-tuning-model.md')
    expect(paths).toContain('plugins/skillset-all/skills/encounter-tuner/references/playtest-protocol.md')
  })

  it('claude-plugin projection has no duplicate rows', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('claude-plugin', REPO_ROOT, files)
    const paths = entries.map((e) => e.projectedPath)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('claude-plugin emits synthesized manifests', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('claude-plugin', REPO_ROOT, files)
    const pluginJson = entries.find((e) => e.projectedPath.endsWith('plugin.json'))
    const marketplaceJson = entries.find((e) => e.projectedPath.endsWith('marketplace.json'))
    expect(pluginJson?.synthesized).toBe(true)
    expect(pluginJson?.sourcePath).toBeNull()
    expect(marketplaceJson?.synthesized).toBe(true)
    expect(marketplaceJson?.sourcePath).toBeNull()
  })

  it('codex emits one AGENTS.md plus per-knowledge files', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('codex', REPO_ROOT, files)
    const agentsMd = entries.find((e) => e.projectedPath === 'AGENTS.md')
    expect(agentsMd?.synthesized).toBe(true)

    const knowledgeFiles = files.filter((f) => f.kind === 'KNOWLEDGE')
    const codexKnowledge = entries.filter((e) => e.projectedPath.startsWith('.skillset/'))
    expect(codexKnowledge.length).toBe(knowledgeFiles.length)
  })

  it('claude-desktop emits a single synthesized context file', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('claude-desktop', REPO_ROOT, files)
    expect(entries.length).toBe(1)
    expect(entries[0].projectedPath).toBe('skillset-context.md')
    expect(entries[0].synthesized).toBe(true)
    expect(entries[0].sourcePath).toBeNull()
  })

  it('all platforms parse without empty/malformed rows', async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const platform of ['claude-code', 'claude-plugin', 'codex', 'claude-desktop'] as const) {
      const entries = await project(platform, REPO_ROOT, files)
      for (const e of entries) {
        expect(e.projectedPath).toBeTruthy()
        expect(e.projectedPath).not.toContain('\t')
      }
    }
  })

  it('source paths reference real library files when set', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const knownPaths = new Set(files.map((f) => f.path))
    for (const platform of ['claude-code', 'claude-plugin', 'codex'] as const) {
      const entries = await project(platform, REPO_ROOT, files)
      for (const e of entries) {
        // ASSETS/ rows are runnable files, not part of the markdown library
        // loadLibrary indexes — only .md source paths must resolve.
        if (e.sourcePath && e.sourcePath.endsWith('.md')) {
          expect(knownPaths.has(e.sourcePath), `${platform}: ${e.sourcePath} not in library`).toBe(true)
        }
      }
    }
  })
})
