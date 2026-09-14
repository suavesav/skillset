import { describe, it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadLibrary } from '../server/utils/library'
import { project, emit } from '../server/utils/projections'
import type { Platform } from '../shared/types'

const execFileP = promisify(execFile)
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const SCRIPTS: Record<string, string> = {
  'claude-plugin': 'platforms/claude-plugin/build.sh',
  codex: 'platforms/codex/setup.sh'
}

/** Run `--emit` directly, returning the exit code rather than throwing. */
async function tryEmit(platform: string, path: string): Promise<{ code: number; stdout: string }> {
  try {
    const { stdout } = await execFileP('bash', [join(REPO_ROOT, SCRIPTS[platform]), '--emit', path], {
      cwd: REPO_ROOT,
      maxBuffer: 64 * 1024 * 1024
    })
    return { code: 0, stdout }
  } catch (err: any) {
    return { code: err.code ?? 1, stdout: err.stdout ?? '' }
  }
}

// `--emit` takes a path straight from an HTTP query parameter on a deployed
// service. Every one of these read a real file before the path guard landed.
const HOSTILE = [
  '../../etc/passwd',
  '/etc/passwd',
  'plugins/skillset-liveops/../../../../../../../../etc/passwd',
  'plugins/skillset-all/_agents/../../../../../../../etc/passwd',
  'plugins/skillset-all/skills/../../../../../../../etc/passwd',
  'agents/../../../../../../../etc/passwd',
  '.skillset/../../../../../../../etc/passwd',
  'skills/../../../SKILLS/encounter-tuner.md',
  './AGENTS.md',
  'AGENTS.md/../AGENTS.md',
  '~/.ssh/id_rsa',
  'plugins/skillset-all/_agents/*.md',
  'plugins/*/skills/*/SKILL.md',
  '$(id).md',
  'a\nAGENTS.md'
]

describe('--emit rejects everything outside the projection', () => {
  for (const platform of Object.keys(SCRIPTS)) {
    it(`${platform} refuses hostile paths`, { timeout: 120_000 }, async () => {
      for (const path of HOSTILE) {
        const { code, stdout } = await tryEmit(platform, path)
        expect(code, `${platform} accepted ${JSON.stringify(path)}`).not.toBe(0)
        expect(stdout, `${platform} leaked bytes for ${JSON.stringify(path)}`).toBe('')
      }
    })
  }

  it('refuses a library path that is not a projected path', { timeout: 60_000 }, async () => {
    // A real, readable file — but not something codex projects to that name.
    const { code } = await tryEmit('codex', 'AGENTS/quill-agent.md')
    expect(code).not.toBe(0)
  })

  it('refuses a listed-looking path inside a real plugin', { timeout: 120_000 }, async () => {
    // Validating only the plugin name still let --emit fabricate files inside
    // it: a skipped skill, or one outside a team plugin's closure.
    for (const [platform, path] of [
      ['claude-plugin', 'plugins/skillset-all/skills/meta/SKILL.md'],
      ['claude-plugin', 'plugins/skillset-design/skills/desync-hunter/SKILL.md'],
      ['claude-plugin', 'plugins/skillset-design/_agents/replay-agent.md']
    ] as const) {
      const { code, stdout } = await tryEmit(platform, path)
      expect(code, `${platform} emitted unlisted ${path}`).not.toBe(0)
      expect(stdout).toBe('')
    }
  })

  it('rejects exactly what --list omits', { timeout: 180_000 }, async () => {
    // The contract in one assertion: emit succeeds iff the path is listed.
    const files = await loadLibrary(REPO_ROOT)
    const listed = new Set((await project('codex', REPO_ROOT, files)).map((e) => e.projectedPath))
    for (const path of [...listed].slice(0, 3)) {
      expect((await tryEmit('codex', path)).code, path).toBe(0)
    }
    for (const path of ['.skillset/does-not-exist.md', 'AGENTS/quill-agent.md', 'SKILLS/meta.md']) {
      expect(listed.has(path)).toBe(false)
      expect((await tryEmit('codex', path)).code, path).not.toBe(0)
    }
  })

  it('refuses a plugin the build does not produce', { timeout: 60_000 }, async () => {
    const { code, stdout } = await tryEmit(
      'claude-plugin',
      'plugins/skillset-totally-made-up/.claude-plugin/plugin.json'
    )
    expect(code).not.toBe(0)
    // It used to fabricate a manifest for any name handed to it.
    expect(stdout).not.toContain('totally-made-up')
  })

  it('still emits every path the projection does list', { timeout: 180_000 }, async () => {
    const files = await loadLibrary(REPO_ROOT)
    for (const platform of ['codex'] as const) {
      const entries = await project(platform, REPO_ROOT, files)
      for (const e of entries) {
        const content = await emit(platform as Platform, REPO_ROOT, e.projectedPath)
        expect(content.length, `${platform}: ${e.projectedPath}`).toBeGreaterThan(0)
      }
    }
  })
})
