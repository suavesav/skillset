import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadLibrary } from '../server/utils/library'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('loadLibrary', () => {
  it('finds skills, agents, and knowledge files', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const skills = files.filter((f) => f.kind === 'SKILL')
    const agents = files.filter((f) => f.kind === 'AGENT')
    const knowledge = files.filter((f) => f.kind === 'KNOWLEDGE')
    expect(skills.length).toBeGreaterThan(0)
    expect(agents.length).toBeGreaterThan(0)
    expect(knowledge.length).toBeGreaterThan(0)
  })

  it('parses YAML frontmatter and body [[links]] for encounter-tuner', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const encounterTuner = files.find((f) => f.name === 'encounter-tuner')
    expect(encounterTuner).toBeDefined()
    expect(encounterTuner!.kind).toBe('SKILL')

    const linkNames = new Set(encounterTuner!.links.map((l) => l.name))
    // From frontmatter
    expect(linkNames.has('quill-agent')).toBe(true)
    expect(linkNames.has('sim-agent')).toBe(true)
    expect(linkNames.has('telemetry-schema')).toBe(true)
    // Frontmatter knowledge entry
    expect(linkNames.has('encounter-tuning-model')).toBe(true)
  })

  it('classifies resolved link kinds correctly', async () => {
    const files = await loadLibrary(REPO_ROOT)
    const encounterTuner = files.find((f) => f.name === 'encounter-tuner')!
    const sim = encounterTuner.links.find((l) => l.name === 'sim-agent')
    expect(sim?.kind).toBe('AGENT')
    expect(sim?.path).toBe('AGENTS/sim-agent.md')

    const schema = encounterTuner.links.find((l) => l.name === 'telemetry-schema')
    expect(schema?.kind).toBe('KNOWLEDGE')
    expect(schema?.path).toBe('KNOWLEDGE/telemetry-schema.md')
  })

  it('does not include self-references in links', async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const f of files) {
      expect(f.links.find((l) => l.name === f.name)).toBeUndefined()
    }
  })
})
