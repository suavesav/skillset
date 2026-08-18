#!/usr/bin/env node
// simbench — headless simulation harness wrapping `kiln-cli sim`.
// Usage: node simbench.mjs --scenario <name> [--patch <json>] [--iterations <n>] [--seed <n>] --out <path>

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

function parseArgs(argv) {
  const args = { iterations: 5000, patch: null, seed: null, out: null, scenario: null };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    const val = argv[i + 1];
    if (!(key in args) || val === undefined) fail(`unknown or valueless flag: ${argv[i]}`, 2);
    args[key] = key === "iterations" || key === "seed" ? Number(val) : val;
  }
  if (!args.scenario) fail("--scenario is required", 2);
  if (!args.out) fail("--out is required", 2);
  if (args.patch !== null) {
    try { args.patch = JSON.parse(args.patch); }
    catch { fail("--patch is not valid JSON", 2); }
  }
  return args;
}

function fail(msg, code) {
  console.error(`simbench: ${msg}`);
  process.exit(code);
}

function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

const args = parseArgs(process.argv.slice(2));

const cliArgs = ["sim", "--scenario", args.scenario, "--iterations", String(args.iterations), "--format", "json"];
if (args.seed !== null) cliArgs.push("--seed", String(args.seed));
if (args.patch !== null) cliArgs.push("--patch", JSON.stringify(args.patch));

let raw;
try {
  raw = execFileSync("kiln-cli", cliArgs, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
} catch (err) {
  const stderr = err.stderr ? String(err.stderr) : "";
  if (/unknown scenario/i.test(stderr)) fail(`unknown scenario: ${args.scenario}`, 3);
  fail(`kiln-cli sim failed: ${stderr.trim() || err.message}`, 1);
}

const sim = JSON.parse(raw);
const metrics = {};
for (const [name, values] of Object.entries(sim.metrics ?? {})) {
  if (Array.isArray(values)) {
    const sorted = [...values].sort((a, b) => a - b);
    metrics[name] = { p10: percentile(sorted, 10), p50: percentile(sorted, 50), p90: percentile(sorted, 90) };
  } else {
    metrics[name] = { p10: values.p10, p50: values.p50, p90: values.p90 }; // pre-aggregated by kiln-cli
  }
}

const result = {
  scenario: args.scenario,
  iterations: sim.iterations ?? args.iterations,
  seed: args.seed,
  patch: args.patch,
  metrics,
  verdicts: sim.verdicts ?? {},
};

writeFileSync(args.out, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ scenario: result.scenario, iterations: result.iterations, metrics: Object.keys(metrics).length, out: args.out }));
