import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, cp, rm, writeFile, mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileP = promisify(execFile)
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * The contract's central claim is that the build and the projection cannot
 * disagree. Asserting it against the current library only proves it for today's
 * files, so this copies the repo and adds the shapes that used to diverge:
 * an agent nothing links to, and a declared runnable asset.
 */
let fixture: string

async function sh(args: string[], cwd: string) {
  return execFileP('bash', [join(cwd, 'platforms/claude-plugin/build.sh'), ...args], {
    cwd,
    maxBuffer: 64 * 1024 * 1024
  })
}

async function walk(dir: string, base = dir): Promise<string[]> {
  const out: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full, base)))
    else out.push(relative(base, full))
  }
  return out.sort()
}

beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'skillset-equiv-'))
  for (const d of ['SKILLS', 'AGENTS', 'KNOWLEDGE', 'ASSETS', 'platforms', 'VERSION']) {
    await cp(join(REPO_ROOT, d), join(fixture, d), { recursive: true })
  }
  await rm(join(fixture, 'platforms/claude-plugin/dist'), { recursive: true, force: true })

  // An agent no skill or agent [[link]]s to. The umbrella build ships every
  // agent; the projection used to list only the reachable ones.
  await writeFile(
    join(fixture, 'AGENTS/orphan-agent.md'),
    '---\nname: orphan-agent\ntype: AGENT\ndescription: nothing links here\nknowledge:\n  - "[[lonely-knowledge]]"\nassets:\n  - "orphan-tool.mjs"\n---\n\n# Orphan\n'
  )
  await writeFile(
    join(fixture, 'KNOWLEDGE/lonely-knowledge.md'),
    '---\nname: lonely-knowledge\ntype: KNOWLEDGE\ndescription: only the orphan cites this\n---\n\n# Lonely\n'
  )
  // A runnable asset declared by the orphan agent: the build copies it
  // verbatim, and the projection must list it from the same declaration.
  await writeFile(join(fixture, 'ASSETS/orphan-tool.mjs'), 'console.log("orphan")\n')
  await mkdir(join(fixture, '.claude-plugin'), { recursive: true })
}, 120_000)

afterAll(async () => {
  if (fixture) await rm(fixture, { recursive: true, force: true })
})

describe('build/projection equivalence', () => {
  it('projects exactly the paths the build writes', async () => {
    await sh([], fixture)
    const { stdout } = await sh(['--list'], fixture)
    const projected = stdout
      .split('\n')
      .filter(Boolean)
      .map((l) => l.split('\t')[0])
      .sort()
    const built = await walk(join(fixture, 'platforms/claude-plugin/dist'))

    const missing = built.filter((p) => !projected.includes(p))
    const phantom = projected.filter((p) => !built.includes(p))
    expect({ builtButNotListed: missing, listedButNotBuilt: phantom }).toEqual({
      builtButNotListed: [],
      listedButNotBuilt: []
    })
  }, 120_000)

  it('includes the unreferenced agent in both', async () => {
    const { stdout } = await sh(['--list'], fixture)
    expect(stdout).toContain('plugins/skillset-all/_agents/orphan-agent.md')
    expect(stdout).toContain('plugins/skillset-all/_agents/references/lonely-knowledge.md')
    expect(stdout).toContain('plugins/skillset-all/_agents/assets/orphan-tool.mjs')
    const built = await walk(join(fixture, 'platforms/claude-plugin/dist'))
    expect(built).toContain('plugins/skillset-all/_agents/orphan-agent.md')
    expect(built).toContain('plugins/skillset-all/_agents/assets/orphan-tool.mjs')
  }, 120_000)

  it('emits the exact bytes the build wrote, correctly framed, for every projected file', async () => {
    const { stdout } = await sh(['--list'], fixture)
    const paths = stdout
      .split('\n')
      .filter(Boolean)
      .map((l) => l.split('\t')[0])

    const { stdout: raw } = await execFileP(
      'bash',
      [join(fixture, 'platforms/claude-plugin/build.sh'), '--emit-all'],
      { cwd: fixture, maxBuffer: 128 * 1024 * 1024, encoding: 'buffer' }
    )
    const out = raw as unknown as Buffer

    // Walk by declared length, the same way the server does.
    const emitted = new Map<string, Buffer>()
    let off = 0
    while (off < out.length) {
      expect(out[off]).toBe(0x1e)
      const nl = out.indexOf(0x0a, off)
      const [path, bytes] = out.toString('utf-8', off + 1, nl).split('\t')
      const n = Number(bytes)
      const next = nl + 1 + n
      // Landing anywhere but the next separator means the length lied.
      expect(next === out.length || out[next] === 0x1e, `bad length for ${path}`).toBe(true)
      emitted.set(path, out.subarray(nl + 1, next))
      off = next
    }

    expect([...emitted.keys()].sort()).toEqual([...paths].sort())
    const mismatched: string[] = []
    for (const path of paths) {
      const disk = await readFile(join(fixture, 'platforms/claude-plugin/dist', path))
      if (!disk.equals(emitted.get(path)!)) mismatched.push(path)
    }
    expect(mismatched).toEqual([])
  }, 180_000)
})
