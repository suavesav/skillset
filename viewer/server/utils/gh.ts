/**
 * Minimal GitHub REST helper for the submit flow. No octokit dependency — the
 * hosted container has no git checkout or `gh` CLI, so PRs are opened purely via
 * the API. Token resolution prefers the org's GitHub App (neutral `skillset[bot]`
 * author), then a fine-grained PAT from the environment, then the local `gh`
 * CLI's token for local development.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createSign } from 'node:crypto'

const execFileP = promisify(execFile)
const API = 'https://api.github.com'

/** Cached installation token — GitHub App tokens live ~1h; refresh 60s early. */
let appToken: { token: string; exp: number } | null = null

/**
 * Mint an installation token for the org's GitHub App so submitted PRs are
 * authored by the neutral `skillset[bot]` identity instead of whoever's PAT is
 * in GITHUB_TOKEN. Requires GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, and
 * GITHUB_APP_PRIVATE_KEY (PEM; escaped \n accepted). Returns null when any are
 * unset so callers fall through to PAT / gh CLI (local dev needs zero setup).
 */
async function githubAppToken(): Promise<string | null> {
  const appId = process.env.GITHUB_APP_ID
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID
  const key = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!appId || !installationId || !key) return null
  if (appToken && Date.now() < appToken.exp) return appToken.token

  const b64url = (s: string) => Buffer.from(s).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }))
  const sig = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(key, 'base64url')

  const res = await fetch(`${API}/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${header}.${payload}.${sig}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'skillset-viewer'
    }
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `GitHub App token exchange failed (${res.status})` })
  }
  const json = await res.json()
  appToken = { token: json.token, exp: Date.parse(json.expires_at) - 60_000 }
  return appToken.token
}

/** App installation token (neutral bot identity) first, then env PAT, then local gh CLI. */
export async function githubToken(): Promise<string | null> {
  const app = await githubAppToken()
  if (app) return app
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  try {
    const { stdout } = await execFileP('gh', ['auth', 'token'])
    return stdout.trim() || null
  } catch {
    return null
  }
}

export function githubRepo(): { owner: string; repo: string } {
  const [owner, repo] = (process.env.SKILLSET_GH_REPO || 'suavesav/skillset').split('/')
  return { owner, repo }
}

export async function ghApi<T = any>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'skillset-viewer'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const text = await res.text()
  // GitHub normally returns JSON, but a proxy/gateway error or empty body can be
  // non-JSON — parse defensively so a SyntaxError doesn't mask the real upstream
  // status (fall back to the raw text as the message).
  let json: any = {}
  if (text) {
    try { json = JSON.parse(text) } catch { json = { message: text.slice(0, 200) } }
  }
  if (!res.ok) {
    const msg = json?.message || `GitHub API ${res.status}`
    // Auth/permission problems are the caller's to fix → 400; else upstream → 502.
    const statusCode = res.status === 401 || res.status === 403 ? 400 : 502
    throw createError({ statusCode, statusMessage: `GitHub: ${msg}` })
  }
  return json as T
}
