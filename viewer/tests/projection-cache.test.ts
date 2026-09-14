import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProjectionCache, libraryRevision } from '../server/utils/projectionCache'

let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'skillset-rev-'))
  for (const d of ['SKILLS', 'AGENTS', 'KNOWLEDGE', 'platforms/codex']) {
    await mkdir(join(root, d), { recursive: true })
  }
  await writeFile(join(root, 'SKILLS/a.md'), '---\nname: a\n---\n\nlinks [[x]]\n')
  await writeFile(join(root, 'KNOWLEDGE/x.md'), '---\nname: x\n---\n\nx\n')
  await writeFile(join(root, 'platforms/codex/setup.sh'), '#!/usr/bin/env bash\n')
})

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true })
})

/** Bump mtime so a same-size rewrite is still observable. */
async function touch(p: string) {
  const t = new Date(Date.now() + 5000)
  await utimes(p, t, t)
}

describe('libraryRevision', () => {
  it('is stable when nothing changes', async () => {
    expect(await libraryRevision(root)).toBe(await libraryRevision(root))
  })

  it('changes when a library file is added', async () => {
    const before = await libraryRevision(root)
    await writeFile(join(root, 'AGENTS/new.md'), '---\nname: new\n---\n')
    expect(await libraryRevision(root)).not.toBe(before)
  })

  it('changes on a same-length edit that swaps one wikilink for another', async () => {
    // The digest-of-parsed-body version missed this: same byte count, different
    // projected reference set.
    const p = join(root, 'SKILLS/a.md')
    const before = await libraryRevision(root)
    await writeFile(p, '---\nname: a\n---\n\nlinks [[y]]\n')
    await touch(p)
    expect(await libraryRevision(root)).not.toBe(before)
  })

  it('changes when a platform script changes', async () => {
    // --list and --describe come from these; edits to them were invisible.
    const p = join(root, 'platforms/codex/setup.sh')
    const before = await libraryRevision(root)
    await writeFile(p, '#!/usr/bin/env bash\necho changed\n')
    await touch(p)
    expect(await libraryRevision(root)).not.toBe(before)
  })

  it('changes when a runnable asset is added under ASSETS/', async () => {
    // Assets ship verbatim, so their bytes are part of what a projection emits.
    const before = await libraryRevision(root)
    await mkdir(join(root, 'ASSETS'), { recursive: true })
    await writeFile(join(root, 'ASSETS/new-tool.mjs'), 'console.log("new")\n')
    expect(await libraryRevision(root)).not.toBe(before)
  })
})

describe('createProjectionCache', () => {
  it('computes once per platform + revision', async () => {
    const cache = createProjectionCache<number>()
    let calls = 0
    const compute = async () => ++calls

    expect(await cache.get('codex', 'r1', compute)).toBe(1)
    expect(await cache.get('codex', 'r1', compute)).toBe(1)
    expect(calls).toBe(1)
  })

  it('recomputes when the library revision changes', async () => {
    const cache = createProjectionCache<number>()
    let calls = 0
    const compute = async () => ++calls

    await cache.get('codex', 'r1', compute)
    expect(await cache.get('codex', 'r2', compute)).toBe(2)
  })

  it('keys separately per platform', async () => {
    const cache = createProjectionCache<string>()
    expect(await cache.get('codex', 'r1', async () => 'a')).toBe('a')
    expect(await cache.get('claude-plugin', 'r1', async () => 'b')).toBe('b')
    expect(await cache.get('codex', 'r1', async () => 'never')).toBe('a')
  })

  it('shares one run between concurrent callers', async () => {
    const cache = createProjectionCache<number>()
    let calls = 0
    const slow = async () => {
      calls++
      await new Promise((r) => setTimeout(r, 40))
      return calls
    }
    // Two callers must ride one bash run.
    const [a, b] = await Promise.all([
      cache.get('claude-plugin', 'r1', slow),
      cache.get('claude-plugin', 'r1', slow)
    ])
    expect(calls).toBe(1)
    expect(a).toBe(b)
  })

  it('does not cache a failure', async () => {
    const cache = createProjectionCache<string>()
    await expect(
      cache.get('codex', 'r1', async () => {
        throw new Error('script blew up')
      })
    ).rejects.toThrow('script blew up')
    // A transient failure must not poison the platform until restart.
    expect(await cache.get('codex', 'r1', async () => 'recovered')).toBe('recovered')
  })
})
