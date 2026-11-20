// Guide content tests: each guide is registered under its file name, and every
// Python snippet that states its output is checked against real Python.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import { PYODIDE_LOAD_MS, getPyodidePair } from '../test/pyodide'
import { GUIDES, GUIDE_ORDER } from './guides'
import { checkSnippet } from './snippetCheck'
import { extractSnippets } from './snippets'

// Read the raw MDX from disk: the MDX plugin would compile a `?raw` import.
const dir = join(import.meta.dirname, 'guides')
const SOURCES = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => [f.replace(/\.mdx$/, ''), readFileSync(join(dir, f), 'utf8')]),
)

let pys: [PyodideAPI, PyodideAPI]
beforeAll(async () => {
  pys = await getPyodidePair()
}, PYODIDE_LOAD_MS)

it('lists every guide, and only those', () => {
  expect([...GUIDE_ORDER].sort()).toEqual(Object.keys(SOURCES).sort())
})

describe.each(Object.entries(SOURCES))('guide %s', (slug, source) => {
  it('exports meta with its file name as slug', () => {
    expect(GUIDES.get(slug)?.meta.slug).toBe(slug)
  })

  it('states real output for every snippet', () => {
    const snippets = extractSnippets(source)
    expect(snippets.flatMap((s) => checkSnippet(s, pys))).toEqual([])
  })
})
