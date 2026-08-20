# Changelog

## 0.2.0 — 2026-08-19

- Projection contract (`platforms/PROJECTION.md`): every platform script now supports `--list` (with an inputs column), `--emit <path>`, `--emit-all`, and `--describe`, with path-traversal guards; the build and the projection share one set of emitter functions so they cannot drift
- Viewer: the Files view can render any platform's compiled output — projected tree, per-file input breakdown for bundles, and byte-exact previews via a revision-keyed projection cache
- Asset pipeline integrated into the contract: declared ASSETS/ files project and emit verbatim alongside references
- New test suites: build/projection equivalence, emit path safety, projection cache, tree building

## 0.1.0 — 2026-08-18

Initial release.

- 15 skills + meta, 5 agents, 18 knowledge files, and the simbench harness asset for the Gladewick Games demo library
- Platform projectors: claude-code, claude-plugin (per-team marketplace build), claude-desktop, codex, generic
- Viewer app: files, graph, diff, and submit pages
- Validator: frontmatter, [[link]] resolution, platform-agnostic rules
