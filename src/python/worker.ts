// Web Worker that owns the Pyodide instance. The runtime is self-hosted in
// public/pyodide/ (see scripts/setup-pyodide.mjs), so it is loaded from there
// at runtime instead of being bundled.
import type * as PyodideModule from 'pyodide'
import type { FromWorker, ToWorker } from './protocol'
import { waitForLine } from './inputChannel'
import { runPython } from './runtime'

const post = (msg: FromWorker) => self.postMessage(msg)

const indexURL = new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.origin).href

const ready = (import(/* @vite-ignore */ `${indexURL}pyodide.mjs`) as Promise<typeof PyodideModule>)
  .then(({ loadPyodide }) => loadPyodide({ indexURL }))
  .then(
    (py) => {
      post({ type: 'ready' })
      return py
    },
    (err: unknown) => {
      post({ type: 'failed', message: String(err) })
      throw err
    },
  )

let inputBuffer: SharedArrayBuffer | null = null

self.onmessage = async ({ data }: MessageEvent<ToWorker>) => {
  if (data.type === 'init') {
    inputBuffer = data.inputBuffer
    return
  }
  const py = await ready
  const { id, req } = data
  const buffer = req.interactive ? inputBuffer : null
  post({ type: 'start', id })
  const result = runPython(py, req, {
    onStdout: (text) => post({ type: 'stdout', id, text }),
    onStderr: (text) => post({ type: 'stderr', id, text }),
    onInput: buffer ? () => waitForLine(buffer, () => post({ type: 'input', id })) : undefined,
  })
  post({ type: 'done', id, result })
}
