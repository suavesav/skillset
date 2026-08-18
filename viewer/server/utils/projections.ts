import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import type { LibraryFile, Platform, ProjectionEntry } from '../../shared/types'

const execFileP = promisify(execFile)

/** Which script (relative to repo root) emits --list for each platform. */
const SCRIPTS: Record<Exclude<Platform, 'raw'>, string> = {
  'claude-code': 'platforms/claude-code/setup.sh',
  'claude-plugin': 'platforms/claude-plugin/build.sh',
  'codex': 'platforms/codex/setup.sh',
  'claude-desktop': 'platforms/claude-desktop/setup.sh'
}

/**
 * Run `bash <script> --list` and parse its tab-separated output.
 * Each row is: projected_path<TAB>source_path<TAB>synth_flag<TAB>note
 * source_path is empty for files synthesized from scratch.
 */
async function runDryRun(repoRoot: string, scriptPath: string): Promise<ProjectionEntry[]> {
  const full = join(repoRoot, scriptPath)
  const { stdout } = await execFileP('bash', [full, '--list'], {
    cwd: repoRoot,
    // Headroom for large libraries so --list output isn't silently truncated,
    // and a timeout so a hung script fails the request instead of hanging it.
    maxBuffer: 16 * 1024 * 1024,
    timeout: 15_000
  })
  const entries: ProjectionEntry[] = []
  for (const line of stdout.split('\n')) {
    if (!line) continue
    const [projectedPath, sourcePath, synth, note] = line.split('\t')
    if (!projectedPath) continue
    entries.push({
      projectedPath,
      sourcePath: sourcePath || null,
      synthesized: synth === '1' || undefined,
      note: note || undefined
    })
  }
  return entries
}

/**
 * Build the projection for a platform.
 *
 * For `raw`, this is the identity mapping over the loaded library (no bash call).
 * For every other platform, this shells out to that platform's setup/build script
 * with `--list`, so the script remains the single source of truth.
 */
export async function project(
  platform: Platform,
  repoRoot: string,
  files: LibraryFile[]
): Promise<ProjectionEntry[]> {
  if (platform === 'raw') {
    return files.map((f) => ({ projectedPath: f.path, sourcePath: f.path }))
  }
  const script = SCRIPTS[platform]
  return runDryRun(repoRoot, script)
}
