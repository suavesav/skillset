# Changelog

## 0.5.0 — 2026-09-14

- Public release under the MIT license. Added `LICENSE`, `CONTRIBUTING.md` (issues and Discussions open, pull requests not accepted), `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue forms, a PR template, Dependabot config, and a workflow that closes pull requests from other accounts.
- Viewer builds as a static site. The five query-string API routes became path-param `.json` routes (`/api/files.json`, `/api/projection/<platform>.json`, `/api/file/<path>.json`, `/api/projected-file/<platform>/<path>.json`, `/api/search-index.json`) so `nuxi generate` prerenders every response; search now runs in the browser over the prerendered index; projected files are prerendered from one `--emit-all` run per platform. `npm run dev` still serves live data. Deployed to GitHub Pages at https://suavesav.github.io/skillset/ by `.github/workflows/pages.yml` on pushes to `main`.
- Marketplace `owner.name` is `suavesav`; the Gladewick Games fiction stays in plugin descriptions and is labelled as demo content in `CLAUDE.md`. README clone URL is HTTPS. Rebuilt `dist/` and the root `marketplace.json`, which had been left at 0.3.0.

## 0.4.0 — 2026-08-27

- Removed the `claude-code` and `claude-desktop` platform projectors. Claude skills are distributed via the plugin marketplace (`claude-plugin`); remaining platform projectors are `claude-plugin`, `codex`, and `generic`. The viewer's platform selector (`raw`, `claude-plugin`, `codex`) and its tests now cover only the scripted ones.

## 0.3.0 — 2026-08-20

- Viewer is read-only and repository-only. Removed the contribution path (submit-for-review modal, preview/submit API routes, GitHub App and token plumbing, submit guards, PR badges) and then the Diff module itself (drift APIs, local-folder picker, `~/.claude` inventory reader, diff renderer, and the `claudeHome` runtime config). The viewer now reads nothing outside this repository: Files and Graph only.

## 0.2.0 — 2026-08-19

- Projection contract (`platforms/PROJECTION.md`): every platform script now supports `--list` (with an inputs column), `--emit <path>`, `--emit-all`, and `--describe`, with path-traversal guards; the build and the projection share one set of emitter functions so they cannot drift
- Viewer: the Files view can render any platform's compiled output — projected tree, per-file input breakdown for bundles, and byte-exact previews via a revision-keyed projection cache
- Asset pipeline integrated into the contract: declared ASSETS/ files project and emit verbatim alongside references
- New test suites: build/projection equivalence, emit path safety, projection cache, tree building

## 0.1.0 — 2026-08-18

Initial release.

- 15 skills + meta, 5 agents, 18 knowledge files, and the simbench harness asset for the Gladewick Games demo library
- Platform projectors: claude-code, claude-plugin (per-team marketplace build), claude-desktop, codex, generic
- Viewer app: files and graph pages
- Validator: frontmatter, [[link]] resolution, platform-agnostic rules
