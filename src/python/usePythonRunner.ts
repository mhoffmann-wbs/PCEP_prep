import { useCallback, useEffect, useRef, useState } from 'react'
import { type RunOutcome, type RunnerStatus, pythonRunner } from './client'
import type { RunRequest } from './runtime'

/** Runs code on the shared runner, streaming output into React state. */
export function usePythonRunner() {
  const [status, setStatus] = useState<RunnerStatus>(pythonRunner.status)
  const [output, setOutput] = useState('')
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Only the latest run may update the panel; earlier queued runs are ignored.
  const latest = useRef(0)

  useEffect(() => pythonRunner.subscribe(setStatus), [])

  const run = useCallback(async (req: RunRequest) => {
    const id = ++latest.current
    setOutput('')
    setOutcome(null)
    setLoadError(null)
    try {
      const append = (text: string) => id === latest.current && setOutput((prev) => prev + text)
      const result = await pythonRunner.run(req, { onStdout: append, onStderr: append })
      if (id === latest.current) setOutcome(result)
    } catch (err) {
      if (id === latest.current) setLoadError(String(err))
    }
  }, [])

  return { status, output, outcome, loadError, run }
}
