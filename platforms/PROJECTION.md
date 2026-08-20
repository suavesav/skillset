# The projection contract

Every platform under `platforms/` compiles the library into a different on-disk
shape. The projection contract is how a platform script describes that shape to
tooling — principally the viewer's **Files** tab — without performing a build.

The script is the single source of truth. Nothing else may hardcode where a file
lands or what it contains: if the build changes, the projection changes with it,
because both run the same emitter functions.

A conforming script supports four modes.

## `--list`

Print one tab-separated row per projected file, then exit 0. Writes nothing.

```
projected_path <TAB> source_path <TAB> synth <TAB> note <TAB> inputs
```

| Column | Meaning |
| --- | --- |
| `projected_path` | Where the file lands, relative to the platform's output root. |
| `source_path` | The library file it comes from, repo-relative. **Empty** when the file is synthesized from more than one source, or from none. |
| `synth` | `1` when the content is built by concatenation or transformation rather than copied byte-for-byte; empty otherwise. |
| `note` | Short human-readable description of the transform, e.g. `frontmatter stripped`. |
| `inputs` | Comma-separated, repo-relative sources feeding a synthesized file, **in the order they are concatenated**. Empty for 1:1 copies, where `source_path` already says it. |

`inputs` is what makes a bundle legible. `codex` compiles the whole library into
one `AGENTS.md`; without `inputs` that is a single opaque row, and the viewer has
nothing to show. With it, the tree can expand the bundle into the many files that
actually went into it.

## `--emit <projected_path>`

Print that one projected file's compiled content to stdout, byte-for-byte
identical to what a real build writes. Exit non-zero with a message on stderr if
the path is not part of the projection.

This is what lets the viewer show the actual post-compile artifact rather than a
placeholder.

**The path argument is untrusted.** It reaches this script from an HTTP query
parameter on a deployed service. Every script therefore runs `is_safe_path`
first — rejecting absolute paths, `.` and `..` segments, and any character
outside `[A-Za-z0-9._-]` — before any branch turns it back into a filesystem
path. Do not skip it, and do not rely on a later `[ -f ]` to catch traversal:
shell `case` globs match `/`, so `plugins/*/x` and
`plugins/skillset-liveops/../../../etc/passwd` both reach the same branch. Where
a path component names something enumerable (a plugin), check it against the
real set rather than trusting it. The viewer additionally refuses to shell out
at all unless the path appears in `--list`, but a script must not depend on
that.

## `--emit-all`

Stream every projected file in one pass. Each record is:

```
\x1e <projected_path> <TAB> <byte length> \n <content>
```

The **byte count locates the next record** — `\x1e` marks a boundary but does not
define one. Nothing stops a library file from containing a `0x1e`, so a reader
that splits on the separator will invent entries; read the header, then consume
exactly N bytes, and treat a byte that is not `\x1e` at the next offset as a
protocol error. The count is a byte count, so the reader must work on bytes, not
a decoded string.

One invocation instead of one per file. Nothing in the viewer renders sizes
today; this mode exists for tooling and is what the contract tests check
`--emit` and the build output against.

## `--describe`

Print one line of prose explaining the platform's compile strategy, for anyone
reading the projection from the command line. The viewer does not render it.

## Implementation shape

Keep the emitters as functions and let both paths call them, so the projection
cannot drift from the build:

```bash
emit_skill_md() { cat "$PREAMBLE"; echo; echo "---"; echo; cat "$1"; }

# the build
emit_skill_md "$skill_file" > "$skill_dir/SKILL.md"

# the projection
--emit) emit_one "$2" ;;   # -> emit_skill_md
```

Drive `--list` and `--emit-all` from a single `walk_projection` that takes a row
callback, so the two can never disagree about which files exist.

`platforms/claude-plugin/build.sh` is the reference implementation: its build
writes exactly the paths its projection reports, with exactly those bytes.
`viewer/tests/build-equivalence.test.ts` asserts that as a property, against a
fixture containing the shapes that have broken it before — an agent nothing
links to, an unexpected file in a verbatim-copied directory, a `.DS_Store`.

Two rules follow from those breakages:

- If the build enumerates a set (every agent, every file in a directory), the
  projection must enumerate it the *same way*, from a shared function. A
  hardcoded `cp` list beside a `find` in the projection will drift.
- Anything that makes the build refuse to run — frontmatter validation, for
  instance — must run in `--list` too. Projecting a plugin the build rejects is
  the same class of lie as omitting one it produces.

## Performance

`--list` is called on every platform switch in the viewer, so it must stay cheap:
resolve `[[link]]`s from one indexed pass rather than a grep per file, and avoid
forking inside BFS walks. macOS ships bash 3.2 — no associative arrays, and
`${var##*pattern}` over a large string is quadratic. Per-file shell variables
(`_links_SKILLS_encounter_tuner_md=...`) give O(1) lookup with no subprocess.

`--emit-all` is allowed to be slower; callers should treat it as a background,
cacheable operation. It compiles every file, so anything `--emit` does per call
is multiplied by the file count — memoize work that does not depend on the path
(`compute_plugin_names` costs an `awk` per skill, and calling it unmemoized per
file took `--emit-all` from 12s to over 150s).

Frame records by the byte count in the header, and parse them that way. The
separator alone is not enough: nothing stops a library file from containing a
`0x1e`, and a split-based parser turns one into a phantom entry.
