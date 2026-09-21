import { defineConfig } from 'vitest/config'

// Several suites shell out to platforms/*/build.sh --list (3-4s cold, more when
// suites run in parallel workers). The 5s default fails on a cold cache.
export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000
  }
})
