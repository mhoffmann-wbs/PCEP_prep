import { useCallback, useEffect, useState } from 'react'
import { type RunOutcome, type RunnerStatus, pythonRunner } from './client'
import type { RunRequest } from './runtime'

/** Runs code on the shared runner, streaming output into React state. */
export function usePythonRunner() {
  const [status, setStatus] = useState<RunnerStatus>(pythonRunner.status)
  const [output, setOutput] = useState('')
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => pythonRunner.subscribe(setStatus), [])

  const run = useCallback(async (req: RunRequest) => {
    setOutput('')
    setOutcome(null)
    setLoadError(null)
    try {
      const append = (text: string) => setOutput((prev) => prev + text)
      setOutcome(await pythonRunner.run(req, { onStdout: append, onStderr: append }))
    } catch (err) {
      setLoadError(String(err))
    }
  }, [])

  return { status, output, outcome, loadError, run }
}
