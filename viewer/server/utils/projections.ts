import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { LibraryFile, Platform, ProjectionEntry } from '../../shared/types'

const execFileP = promisify(execFile)

/** The script implementing each platform's projection, relative to repo root. */
const SCRIPTS: Record<Exclude<Platform, 'raw'>, string> = {
  'claude-code': 'platforms/claude-code/setup.sh',
  'claude-plugin': 'platforms/claude-plugin/build.sh',
  'codex': 'platforms/codex/setup.sh',
  'claude-desktop': 'platforms/claude-desktop/setup.sh'
}

/** ASCII record separator — frames files in `--emit-all` output. */
const RS = 0x1e
const LF = 0x0a

/** Run one of a platform script's projection modes (platforms/PROJECTION.md). */
async function runScript(
  repoRoot: string,
  scriptPath: string,
  args: string[],
  timeout: number
): Promise<string> {
  return (await runScriptRaw(repoRoot, scriptPath, args, timeout)).toString('utf-8')
}

/** Undecoded — `--emit-all` frames records by byte count. */
async function runScriptRaw(
  repoRoot: string,
  scriptPath: string,
  args: string[],
  timeout: number
): Promise<Buffer> {
  const { stdout } = await execFileP('bash', [join(repoRoot, scriptPath), ...args], {
    cwd: repoRoot,
    // Headroom against silent truncation; timeout so a hung script fails fast.
    maxBuffer: 128 * 1024 * 1024,
    encoding: 'buffer',
    timeout
  })
  return stdout as unknown as Buffer
}

/** Parse `--list` output: projected<TAB>source<TAB>synth<TAB>note<TAB>inputs */
function parseList(stdout: string): ProjectionEntry[] {
  const entries: ProjectionEntry[] = []
  for (const line of stdout.split('\n')) {
    if (!line) continue
    const [projectedPath, sourcePath, synth, note, inputs] = line.split('\t')
    if (!projectedPath) continue
    entries.push({
      projectedPath,
      sourcePath: sourcePath || null,
      synthesized: synth === '1' || undefined,
      note: note || undefined,
      inputs: inputs ? inputs.split(',').filter(Boolean) : undefined
    })
  }
  return entries
}

/** `raw` is the identity mapping; everything else shells out to `--list`. */
export async function project(
  platform: Platform,
  repoRoot: string,
  files: LibraryFile[]
): Promise<ProjectionEntry[]> {
  if (platform === 'raw') {
    return files.map((f) => ({ projectedPath: f.path, sourcePath: f.path }))
  }
  return parseList(await runScript(repoRoot, SCRIPTS[platform], ['--list'], 30_000))
}

/** Typed reader for `--describe`. Not rendered; empty for `raw`. */
export async function describe(platform: Platform, repoRoot: string): Promise<string> {
  if (platform === 'raw') return ''
  try {
    return (await runScript(repoRoot, SCRIPTS[platform], ['--describe'], 10_000)).trim()
  } catch {
    return ''
  }
}

/** Compile one projected file. `raw` has none — read those via /api/file. */
export async function emit(
  platform: Platform,
  repoRoot: string,
  projectedPath: string
): Promise<string> {
  if (platform === 'raw') throw new Error('raw has no compiled form')
  return runScript(repoRoot, SCRIPTS[platform], ['--emit', projectedPath], 30_000)
}

/**
 * Byte size of every projected file, from one `--emit-all` pass. Compiles the
 * whole output, so a caller must cache it. Nothing renders sizes — this is the
 * reference reader for the framing, exercised by the contract tests.
 */
export async function emitAllSizes(
  platform: Platform,
  repoRoot: string,
  files: LibraryFile[]
): Promise<Record<string, number>> {
  const sizes: Record<string, number> = {}
  if (platform === 'raw') {
    // bodyLength is the parsed body's UTF-16 length: no frontmatter, not bytes.
    for (const f of files) {
      try {
        sizes[f.path] = (await stat(join(repoRoot, f.path))).size
      } catch {
        sizes[f.path] = 0
      }
    }
    return sizes
  }
  // By declared length, not by splitting: a 0x1e in content is legal.
  const out = await runScriptRaw(repoRoot, SCRIPTS[platform], ['--emit-all'], 120_000)
  let off = 0
  while (off < out.length) {
    if (out[off] !== RS) {
      throw new Error(`--emit-all: expected a record separator at byte ${off}`)
    }
    const nl = out.indexOf(LF, off)
    if (nl === -1) break
    const [path, bytes] = out.toString('utf-8', off + 1, nl).split('\t')
    const n = Number(bytes)
    if (!path || !Number.isInteger(n) || n < 0) {
      throw new Error(`--emit-all: malformed record header at byte ${off}`)
    }
    sizes[path] = n
    off = nl + 1 + n
  }
  return sizes
}
