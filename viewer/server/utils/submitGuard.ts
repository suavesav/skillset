/**
 * Abuse guards for the contribute endpoints. The submit endpoint opens PRs with
 * a server-side GitHub App token, so without these any page (or any visitor of
 * the hosted app) could drive PR creation under the bot identity.
 *
 * Two layers, no dependencies:
 *  - `assertSameOrigin` — rejects cross-site browser requests (CSRF).
 *  - `assertUnderRateLimit` — caps submissions per client and overall.
 *
 * Neither is authentication. The hosted viewer is unauthenticated by design
 * (read-only browsing); gating writes behind real sign-in is a follow-up, and
 * `SKILLSET_SUBMIT_DISABLED=1` turns the write path off entirely meanwhile.
 */
// Imported explicitly rather than relying on Nitro auto-imports so the guards
// can be unit-tested outside the Nuxt runtime.
import { createError, getRequestHeader, type H3Event } from 'h3'

/** Requests per client per window, and across all clients (bot-identity budget). */
const WINDOW_MS = 10 * 60 * 1000
const PER_CLIENT = 5
const GLOBAL = 30

type Window = { count: number; resetAt: number }
const perClient = new Map<string, Window>()
let globalWindow: Window = { count: 0, resetAt: 0 }

/** Test-only: drop all accumulated counters so cases don't leak into each other. */
export function resetRateLimits(): void {
  perClient.clear()
  globalWindow = { count: 0, resetAt: 0 }
}

/** Roll the window forward if it has expired, without counting a hit yet. */
function roll(w: Window, now: number): Window {
  return now >= w.resetAt ? { count: 0, resetAt: now + WINDOW_MS } : w
}

/** Best-effort client key: the proxy-forwarded IP, else the socket address. */
function clientKey(event: H3Event): string {
  const fwd = getRequestHeader(event, 'x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return event.node.req.socket?.remoteAddress || 'unknown'
}

/**
 * Reject cross-site requests. Browsers label every fetch with `Sec-Fetch-Site`
 * and send `Origin` on cross-origin POSTs, so checking both catches form-post
 * and fetch CSRF. Non-browser clients (curl, tests) send neither and are left to
 * the rate limiter — CSRF is a browser-only threat.
 */
export function assertSameOrigin(event: H3Event): void {
  const site = getRequestHeader(event, 'sec-fetch-site')
  if (site && site !== 'same-origin' && site !== 'none') {
    throw createError({ statusCode: 403, statusMessage: 'cross-site requests are not allowed' })
  }

  const origin = getRequestHeader(event, 'origin')
  if (!origin) return
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host')
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw createError({ statusCode: 403, statusMessage: 'invalid Origin header' })
  }
  if (!host || originHost !== host) {
    throw createError({ statusCode: 403, statusMessage: 'cross-origin requests are not allowed' })
  }
}

/** Fixed-window rate limit, per client and global. Throws 429 when exceeded. */
export function assertUnderRateLimit(event: H3Event): void {
  const now = Date.now()
  const key = clientKey(event)

  // Check both windows before counting, so a rejected request doesn't burn the
  // other window's budget.
  const g = roll(globalWindow, now)
  const c = roll(perClient.get(key) ?? { count: 0, resetAt: 0 }, now)
  globalWindow = g
  perClient.set(key, c)

  if (g.count >= GLOBAL) {
    throw createError({ statusCode: 429, statusMessage: 'submission limit reached — try again later' })
  }
  if (c.count >= PER_CLIENT) {
    throw createError({ statusCode: 429, statusMessage: 'too many submissions — try again later' })
  }
  g.count += 1
  c.count += 1

  // Bound the map so a long-lived process can't accumulate stale keys.
  if (perClient.size > 1000) {
    for (const [k, w] of perClient) if (now >= w.resetAt) perClient.delete(k)
  }
}

/** Kill switch for deployments that don't want the write path exposed at all. */
export function assertSubmitEnabled(): void {
  if (process.env.SKILLSET_SUBMIT_DISABLED === '1') {
    throw createError({ statusCode: 403, statusMessage: 'submitting is disabled on this deployment' })
  }
}
