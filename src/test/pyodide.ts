// Pyodide in Node for tests: instances per test file, loaded on first use.
import { type PyodideAPI, loadPyodide } from 'pyodide'

let instance: Promise<PyodideAPI> | undefined

export const getPyodide = () => (instance ??= loadPyodide())

let pair: Promise<[PyodideAPI, PyodideAPI]> | undefined

/** Two instances with different fixed hash seeds, for determinism checks. */
export const getPyodidePair = () =>
  (pair ??= Promise.all([loadPyodide({ env: { PYTHONHASHSEED: '1' } }), loadPyodide({ env: { PYTHONHASHSEED: '2' } })]))

/** Generous timeout for hooks that load Pyodide. */
export const PYODIDE_LOAD_MS = 60_000
