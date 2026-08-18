import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadConversion, validateCandidate } from '../../utils/contributeLoad'
import { bumpPatch, changelogEntry, insertChangelogEntry } from '../../utils/contribute'
import { githubToken, githubRepo, ghApi } from '../../utils/gh'
import { assertSameOrigin, assertUnderRateLimit, assertSubmitEnabled } from '../../utils/submitGuard'
import type { ContributeSubmitResponse } from '../../../shared/types'

/**
 * Submit a local skill/agent to the library as a PR — entirely via the GitHub
 * REST API (no git checkout, no `gh` push), so it runs in the hosted container.
 * The local side comes from the browser (loadConversion reads body.localContent);
 * the base + VERSION/CHANGELOG come from the repo snapshot.
 */
export default defineEventHandler(async (event): Promise<ContributeSubmitResponse> => {
  // This endpoint writes to GitHub under a server-side token, so guard it before
  // doing any work: kill switch, cross-site rejection, then rate limit.
  assertSubmitEnabled()
  assertSameOrigin(event)
  assertUnderRateLimit(event)

  const { root, result, request } = await loadConversion(event)

  const token = await githubToken()
  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No GitHub token available — set GITHUB_TOKEN, or run `gh auth login` for local dev.'
    })
  }
  const { owner, repo } = githubRepo()

  // Dup guard: if an open PR already exists for this item, return it instead.
  const branchPrefix = `contrib/${result.name}-`
  const openPrs = await ghApi<any[]>(token, 'GET', `/repos/${owner}/${repo}/pulls?state=open&per_page=100`)
  const existing = openPrs.find((p) => p?.head?.ref?.startsWith(branchPrefix))
  if (existing) {
    return { prUrl: existing.html_url, branch: existing.head.ref, existing: true }
  }

  // Gate on the repo validator before anything leaves the machine.
  const errors = await validateCandidate(root, root, result)
  if (errors.length > 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'validation failed — fix these before submitting',
      data: { validationErrors: errors }
    })
  }

  // Base off main.
  const ref = await ghApi<any>(token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/main`)
  const baseSha = ref.object.sha
  const baseCommit = await ghApi<any>(token, 'GET', `/repos/${owner}/${repo}/git/commits/${baseSha}`)

  // VERSION patch bump + CHANGELOG entry (from the repo snapshot ≈ main).
  const version = bumpPatch(await readFile(join(root, 'VERSION'), 'utf-8'))
  const changelog = insertChangelogEntry(
    await readFile(join(root, 'CHANGELOG.md'), 'utf-8'),
    changelogEntry(version, new Date().toISOString().slice(0, 10), result)
  )

  const tree = await ghApi<any>(token, 'POST', `/repos/${owner}/${repo}/git/trees`, {
    base_tree: baseCommit.tree.sha,
    tree: [
      { path: result.targetPath, mode: '100644', type: 'blob', content: result.content },
      { path: 'VERSION', mode: '100644', type: 'blob', content: version + '\n' },
      { path: 'CHANGELOG.md', mode: '100644', type: 'blob', content: changelog }
    ]
  })

  const action = result.isNew ? 'add' : 'update'
  const commit = await ghApi<any>(token, 'POST', `/repos/${owner}/${repo}/git/commits`, {
    message: `feat: ${action} ${result.name} (submitted from viewer)`,
    tree: tree.sha,
    parents: [baseSha]
  })

  const branch = `${branchPrefix}${commit.sha.slice(0, 7)}`
  await ghApi(token, 'POST', `/repos/${owner}/${repo}/git/refs`, {
    ref: `refs/heads/${branch}`,
    sha: commit.sha
  })

  // Title tracks the actual kind — an AGENT submission labelled "Skill …" is
  // misleading in the PR list.
  const kindWord = result.kind === 'AGENT' ? 'Agent' : 'Skill'
  const title = result.isNew
    ? `${kindWord} proposal: ${result.name}`
    : `${kindWord} update: ${result.name}`
  // PRs are authored by the neutral skillset[bot], so the submitter's own
  // handle is the only human attribution a reviewer sees. It is self-reported
  // and untrusted — strip anything that isn't a GitHub handle so it can't be
  // used to inject markdown or @-mention arbitrary people.
  const submitter = (request.submitter ?? '').trim().replace(/^@/, '')
  const submittedBy = /^[A-Za-z0-9-]{1,39}$/.test(submitter) ? submitter : null
  const prBody = [
    result.isNew
      ? `Proposes a new ${result.kind.toLowerCase()} \`${result.name}\`.`
      : `Updates \`${result.name}\` from a local iteration.`,
    result.description ? `\n> ${result.description}` : '',
    `\n- Submitted from the skillset viewer${submittedBy ? ` by \`@${submittedBy}\` (self-reported)` : ''}`,
    `- Converted to library format and validated with \`scripts/validate.py\``,
    `- Bumps VERSION to ${version}`
  ].join('\n')

  const pr = await ghApi<any>(token, 'POST', `/repos/${owner}/${repo}/pulls`, {
    title,
    head: branch,
    base: 'main',
    body: prBody
  })

  return { prUrl: pr.html_url, branch }
})
