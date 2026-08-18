import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import {
  assertSameOrigin,
  assertUnderRateLimit,
  assertSubmitEnabled,
  resetRateLimits
} from '../server/utils/submitGuard'

/** Minimal stand-in for the parts of H3Event the guards read. */
function evt(headers: Record<string, string>, ip = '203.0.113.7'): H3Event {
  return {
    node: { req: { headers, socket: { remoteAddress: ip } } }
  } as unknown as H3Event
}

function status(fn: () => void): number | null {
  try {
    fn()
    return null
  } catch (e: any) {
    return e.statusCode
  }
}

describe('assertSameOrigin', () => {
  it('allows same-origin browser requests', () => {
    const e = evt({ 'sec-fetch-site': 'same-origin', origin: 'https://viewer.example', host: 'viewer.example' })
    expect(status(() => assertSameOrigin(e))).toBeNull()
  })

  it('allows non-browser clients that send neither header', () => {
    expect(status(() => assertSameOrigin(evt({})))).toBeNull()
  })

  it('rejects a cross-site Sec-Fetch-Site', () => {
    expect(status(() => assertSameOrigin(evt({ 'sec-fetch-site': 'cross-site' })))).toBe(403)
  })

  it('rejects an Origin that does not match the host', () => {
    const e = evt({ origin: 'https://evil.example', host: 'viewer.example' })
    expect(status(() => assertSameOrigin(e))).toBe(403)
  })

  it('honours the proxy-forwarded host', () => {
    const e = evt({ origin: 'https://viewer.example', host: 'localhost:3000', 'x-forwarded-host': 'viewer.example' })
    expect(status(() => assertSameOrigin(e))).toBeNull()
  })

  it('rejects an unparseable Origin', () => {
    expect(status(() => assertSameOrigin(evt({ origin: 'not-a-url', host: 'viewer.example' })))).toBe(403)
  })
})

describe('assertUnderRateLimit', () => {
  beforeEach(resetRateLimits)

  it('allows the first burst then 429s the same client', () => {
    const e = evt({}, '198.51.100.1')
    for (let i = 0; i < 5; i++) expect(status(() => assertUnderRateLimit(e))).toBeNull()
    expect(status(() => assertUnderRateLimit(e))).toBe(429)
  })

  it('keys separate clients independently', () => {
    const a = evt({}, '198.51.100.1')
    const b = evt({}, '198.51.100.2')
    for (let i = 0; i < 5; i++) assertUnderRateLimit(a)
    expect(status(() => assertUnderRateLimit(a))).toBe(429)
    expect(status(() => assertUnderRateLimit(b))).toBeNull()
  })

  it('prefers the proxy-forwarded client IP over the socket address', () => {
    const shared = '198.51.100.9'
    const a = evt({ 'x-forwarded-for': '203.0.113.1, 70.0.0.1' }, shared)
    const b = evt({ 'x-forwarded-for': '203.0.113.2, 70.0.0.1' }, shared)
    for (let i = 0; i < 5; i++) assertUnderRateLimit(a)
    expect(status(() => assertUnderRateLimit(a))).toBe(429)
    expect(status(() => assertUnderRateLimit(b))).toBeNull()
  })

  it('caps the global budget across clients', () => {
    // 30 global / 5 per client → the 7th distinct client is refused.
    for (let c = 0; c < 6; c++) {
      const e = evt({}, `192.0.2.${c}`)
      for (let i = 0; i < 5; i++) expect(status(() => assertUnderRateLimit(e))).toBeNull()
    }
    expect(status(() => assertUnderRateLimit(evt({}, '192.0.2.99')))).toBe(429)
  })

  it('does not spend the per-client budget when the global cap rejects', () => {
    for (let c = 0; c < 6; c++) {
      const e = evt({}, `192.0.2.${c}`)
      for (let i = 0; i < 5; i++) assertUnderRateLimit(e)
    }
    const fresh = evt({}, '192.0.2.99')
    expect(status(() => assertUnderRateLimit(fresh))).toBe(429)
    resetRateLimits()
    // Budget was never consumed for this client, so it gets a full window back.
    for (let i = 0; i < 5; i++) expect(status(() => assertUnderRateLimit(fresh))).toBeNull()
  })
})

describe('assertSubmitEnabled', () => {
  afterEach(() => {
    delete process.env.SKILLSET_SUBMIT_DISABLED
  })

  it('passes by default', () => {
    expect(status(assertSubmitEnabled)).toBeNull()
  })

  it('refuses when the kill switch is set', () => {
    process.env.SKILLSET_SUBMIT_DISABLED = '1'
    expect(status(assertSubmitEnabled)).toBe(403)
  })
})
