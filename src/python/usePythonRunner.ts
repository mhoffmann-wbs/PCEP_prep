import { useCallback, useEffect, useRef, useState } from 'react'
import { type RunOutcome, type RunnerStatus, pythonRunner } from './client'
import type { RunRequest } from './runtime'

/** Runs code on the shared runner, streaming output into React state. */
export function usePythonRunner() {
  const [status, setStatus] = useState<RunnerStatus>(pythonRunner.status)
  const [output, setOutput] = useState('')
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  /** The program waits in input() for a line from the learner. */
  const [waiting, setWaiting] = useState(false)

  // Only the latest run may update the panel; earlier queued runs are ignored.
  const latest = useRef(0)
  const waitingRef = useRef(false)
  const setWaitingBoth = useCallback((on: boolean) => {
    waitingRef.current = on
    setWaiting(on)
  }, [])

  useEffect(() => pythonRunner.subscribe(setStatus), [])
  // A program left waiting for input would block the runner: end its input.
  useEffect(
    () => () => {
      if (waitingRef.current) pythonRunner.provideInput(null)
    },
    [],
  )

  /** Answers the waiting program; the line is echoed into the output like a terminal does. */
  const sendInput = useCallback((line: string | null) => {
    if (!waitingRef.current) return
    setWaitingBoth(false)
    if (line !== null) setOutput((prev) => `${prev}${line}\n`)
    pythonRunner.provideInput(line)
  }, [setWaitingBoth])

  const run = useCallback(async (req: RunRequest) => {
    if (waitingRef.current) {
      setWaitingBoth(false)
      pythonRunner.provideInput(null)
    }
    const id = ++latest.current
    setOutput('')
    setOutcome(null)
    setLoadError(null)
    try {
      const append = (text: string) => id === latest.current && setOutput((prev) => prev + text)
      const result = await pythonRunner.run(
        { ...req, interactive: pythonRunner.interactive },
        {
          onStdout: append,
          onStderr: append,
          onInputRequest: () => {
            // A superseded run gets no answer from the learner, so end its input at once.
            if (id === latest.current) setWaitingBoth(true)
            else pythonRunner.provideInput(null)
          },
        },
      )
      if (id === latest.current) {
        setWaitingBoth(false)
        setOutcome(result)
      }
    } catch (err) {
      if (id === latest.current) setLoadError(String(err))
    }
  }, [setWaitingBoth])

  return { status, output, outcome, loadError, run, waiting, sendInput, interactive: pythonRunner.interactive }
}
