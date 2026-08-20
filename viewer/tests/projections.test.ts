import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadLibrary } from '../server/utils/library'
import { project, describe as describePlatform, emit, emitAllSizes } from '../server/utils/projections'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Platforms whose projection comes from a script (i.e. everything but `raw`). */
const PLATFORMS_WITH_SCRIPTS = ['claude-code', 'claude-plugin', 'codex', 'claude-desktop'] as const

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
    // [[playtest-protocol]]. playtest-protocol is reachable only transitively, so
    // its presence proves --list walks the closure (not just direct links).
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
        if (!e.sourcePath) continue
        // ASSETS/ holds runnable files outside the markdown library loadLibrary
        // indexes; platform-owned sources are copied verbatim from platforms/.
        if (e.sourcePath.startsWith('ASSETS/') || e.sourcePath.startsWith('platforms/')) {
          expect(existsSync(resolve(REPO_ROOT, e.sourcePath))).toBe(true)
          continue
        }
        expect(knownPaths.has(e.sourcePath), `${platform}: ${e.sourcePath} not in library`).toBe(true)
      }
    }
  })
})

describe('projection contract: inputs', () => {
  it("codex's AGENTS.md reports every skill and agent it concatenates", async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('codex', REPO_ROOT, files)
    const agentsMd = entries.find((e) => e.projectedPath === 'AGENTS.md')!

    // This row used to be opaque; it must now name its inputs.
    const skills = files.filter((f) => f.kind === 'SKILL')
    const agents = files.filter((f) => f.kind === 'AGENT')
    expect(agentsMd.inputs?.length).toBe(skills.length + agents.length + 1) // + preamble

    expect(agentsMd.inputs).toContain('platforms/codex/preamble.md')
    for (const s of skills) expect(agentsMd.inputs).toContain(s.path)
    for (const a of agents) expect(agentsMd.inputs).toContain(a.path)
  })

  it("claude-desktop's context file reports knowledge as well", async () => {
    const files = await loadLibrary(REPO_ROOT)
    const [entry] = await project('claude-desktop', REPO_ROOT, files)
    // Everything is flattened, so every library file is an input.
    expect(entry.inputs?.length).toBe(files.length + 1) // + preamble
    for (const f of files) expect(entry.inputs).toContain(f.path)
  })

  it('inputs are in concatenation order: preamble first', async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const [platform, preamble] of [
      ['codex', 'platforms/codex/preamble.md'],
      ['claude-desktop', 'platforms/claude-desktop/preamble.md']
    ] as const) {
      const entries = await project(platform, REPO_ROOT, files)
      const bundle = entries.find((e) => e.inputs?.length)!
      expect(bundle.inputs![0]).toBe(preamble)
    }
  })

  it('every input names a file that exists', { timeout: 60_000 }, async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const platform of PLATFORMS_WITH_SCRIPTS) {
      const entries = await project(platform, REPO_ROOT, files)
      for (const e of entries) {
        for (const input of e.inputs ?? []) {
          expect(
            existsSync(resolve(REPO_ROOT, input)),
            `${platform}: ${e.projectedPath} claims input ${input}`
          ).toBe(true)
        }
      }
    }
  })

  it('only synthesized files declare inputs, and some file does', async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const platform of PLATFORMS_WITH_SCRIPTS) {
      const entries = await project(platform, REPO_ROOT, files)
      // Floor first: without it this passes when a platform emits no inputs.
      expect(entries.some((e) => e.inputs?.length), platform).toBe(true)
      for (const e of entries) {
        if (e.inputs?.length) {
          expect(e.synthesized, `${platform}: ${e.projectedPath}`).toBe(true)
        }
      }
    }
  })
})

describe('projection contract: describe()', () => {
  it('every compiling platform explains its strategy in one line', async () => {
    const seen = new Set<string>()
    for (const platform of PLATFORMS_WITH_SCRIPTS) {
      const text = await describePlatform(platform, REPO_ROOT)
      expect(text.length, platform).toBeGreaterThan(40)
      expect(text.includes('\n'), platform).toBe(false)
      // Distinct and about this platform's own output — a shared boilerplate
      // line would satisfy a pure length check.
      expect(seen.has(text), `${platform} repeats another platform's text`).toBe(false)
      seen.add(text)
      const artefact = { 'claude-code': 'skills/', 'claude-plugin': 'plugin',
                         codex: 'AGENTS.md', 'claude-desktop': 'skillset-context.md' }[platform]
      expect(text, platform).toContain(artefact)
    }
  })

  it('raw has no strategy to describe', async () => {
    // Nothing is compiled, so the viewer renders no description block.
    expect(await describePlatform('raw', REPO_ROOT)).toBe('')
  })
})

describe('projection contract: emit()', () => {
  it('compiles a codex bundle containing every skill body', { timeout: 60_000 }, async () => {
    const content = await emit('codex', REPO_ROOT, 'AGENTS.md')
    const files = await loadLibrary(REPO_ROOT)
    for (const s of files.filter((f) => f.kind === 'SKILL')) {
      expect(content, `AGENTS.md missing ${s.name}`).toContain(`### ${s.name}`)
    }
  })

  it('compiles a claude-code SKILL.md as preamble + body', { timeout: 60_000 }, async () => {
    const content = await emit('claude-code', REPO_ROOT, 'skills/encounter-tuner/SKILL.md')
    const preamble = readFileSync(resolve(REPO_ROOT, 'platforms/claude-code/preamble.md'), 'utf-8')
    expect(content.startsWith(preamble)).toBe(true)
    expect(content).toContain('name: encounter-tuner')
  })

  it('strips frontmatter from claude-plugin references', { timeout: 60_000 }, async () => {
    const content = await emit(
      'claude-plugin',
      REPO_ROOT,
      'plugins/skillset-all/skills/encounter-tuner/references/encounter-tuning-model.md'
    )
    expect(content.startsWith('---')).toBe(false)
  })

  it('rejects a path outside the projection', { timeout: 60_000 }, async () => {
    await expect(emit('codex', REPO_ROOT, '../../etc/passwd')).rejects.toThrow()
    await expect(emit('codex', REPO_ROOT, 'AGENTS/quill-agent.md')).rejects.toThrow()
  })

  it('raw has no compiled form', { timeout: 60_000 }, async () => {
    await expect(emit('raw', REPO_ROOT, 'SKILLS/encounter-tuner.md')).rejects.toThrow()
  })
})

describe('projection contract: emitAllSizes()', () => {
  it('sizes every projected file for codex', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const entries = await project('codex', REPO_ROOT, files)
    const sizes = await emitAllSizes('codex', REPO_ROOT, files)
    expect(Object.keys(sizes).length).toBe(entries.length)
    for (const e of entries) {
      expect(sizes[e.projectedPath], e.projectedPath).toBeGreaterThan(0)
    }
  })

  it('reported size matches the compiled bytes', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const sizes = await emitAllSizes('codex', REPO_ROOT, files)
    const content = await emit('codex', REPO_ROOT, 'AGENTS.md')
    expect(sizes['AGENTS.md']).toBe(Buffer.byteLength(content))
  })
})
