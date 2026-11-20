// Copies the self-hosted Pyodide runtime from node_modules into public/pyodide/
// (git-ignored). Runs before dev, build and test. Only the stdlib is shipped.
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const srcDir = dirname(require.resolve('pyodide/package.json'))
const { version } = JSON.parse(readFileSync(join(srcDir, 'package.json'), 'utf8'))
const outDir = join(root, 'public', 'pyodide')
const stamp = join(outDir, '.version')

const upToDate =
  existsSync(stamp) &&
  readFileSync(stamp, 'utf8') === version &&
  FILES.every((f) => existsSync(join(outDir, f)) && statSync(join(outDir, f)).size === statSync(join(srcDir, f)).size)

if (upToDate) {
  console.log(`pyodide ${version}: public/pyodide is up to date`)
} else {
  mkdirSync(outDir, { recursive: true })
  for (const f of FILES) copyFileSync(join(srcDir, f), join(outDir, f))
  writeFileSync(stamp, version)
  console.log(`pyodide ${version}: copied ${FILES.length} files to public/pyodide`)
}
