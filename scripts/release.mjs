#!/usr/bin/env node
/**
 * Release helper.
 *
 * Usage:
 *   yarn release 1.1.2
 *
 * - Updates `version` in package.json, src-tauri/tauri.conf.json, and src-tauri/Cargo.toml
 * - Commits the bump
 * - Creates an annotated tag `vX.Y.Z`
 * - Pushes the commit and the tag (which triggers .github/workflows/release.yml)
 *
 * Aborts if the working tree is dirty (other than the bumped files) or if the
 * requested version isn't a valid semver `X.Y.Z`.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: yarn release <version>   e.g. yarn release 1.1.2')
  process.exit(1)
}
const tag = `v${version}`

function sh(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'pipe', encoding: 'utf8', ...opts })
  if (res.status !== 0) {
    process.stderr.write(res.stderr || res.stdout || '')
    throw new Error(`${cmd} ${args.join(' ')} failed`)
  }
  return res.stdout.trim()
}

// 1. Sanity checks ----------------------------------------------------------
const status = sh('git', ['status', '--porcelain'])
if (status) {
  console.error('Working tree is not clean. Commit or stash first:\n' + status)
  process.exit(1)
}

const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
if (branch !== 'main') {
  console.warn(`! You are on branch '${branch}', not 'main'. Continuing anyway.`)
}

const existingTags = sh('git', ['tag', '--list', tag])
if (existingTags) {
  console.error(`Tag ${tag} already exists.`)
  process.exit(1)
}

// 2. Bump files -------------------------------------------------------------
function bumpJson(path, mutate) {
  const full = resolve(repoRoot, path)
  const original = readFileSync(full, 'utf8')
  const parsed = JSON.parse(original)
  mutate(parsed)
  // Preserve trailing newline if the original had one
  const newline = original.endsWith('\n') ? '\n' : ''
  // Detect indentation (2 vs 4 spaces) from the original
  const indentMatch = original.match(/\n( +)"/)
  const indent = indentMatch ? indentMatch[1].length : 2
  writeFileSync(full, JSON.stringify(parsed, null, indent) + newline)
}

bumpJson('package.json', (j) => { j.version = version })
bumpJson('src-tauri/tauri.conf.json', (j) => { j.version = version })

// Cargo.toml — only replace the [package] version, not dependency versions
const cargoPath = resolve(repoRoot, 'src-tauri/Cargo.toml')
const cargo = readFileSync(cargoPath, 'utf8')
const cargoNew = cargo.replace(
  /(^\[package\][^[]*?\nversion\s*=\s*)"[^"]*"/m,
  `$1"${version}"`
)
if (cargoNew === cargo) {
  console.error('Failed to update Cargo.toml [package] version')
  process.exit(1)
}
writeFileSync(cargoPath, cargoNew)

console.log(`✔ Bumped to ${version} in package.json, tauri.conf.json, Cargo.toml`)

// 3. Commit, tag, push ------------------------------------------------------
sh('git', ['add', 'package.json', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml'])
sh('git', ['commit', '-m', `release: ${tag}`])
sh('git', ['tag', '-a', tag, '-m', `Release ${tag}`])

console.log(`✔ Committed and tagged ${tag}`)
console.log('  Pushing branch + tag...')

execFileSync('git', ['push'], { cwd: repoRoot, stdio: 'inherit' })
execFileSync('git', ['push', 'origin', tag], { cwd: repoRoot, stdio: 'inherit' })

console.log(`\n✔ Done. Watch the build: https://github.com/P-ZeN/clickomator-v1/actions`)
