import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { RunnerPanel } from '../components/RunnerPanel'
import { getProgress, setPlaygroundCode } from '../progress/store'
import { pythonRunner } from '../python/client'
import { decodeCode, encodeCode } from './playgroundLink'

const SAMPLE = `name = input("What is your name? ")
print("Hello,", name)

with open("shopping.txt") as f:
    items = f.read().split()
print("You need", len(items), "items")

with open("done.txt", "w") as f:
    f.write("bought: " + items[0] + "\\n")
`

const SAMPLE_FILES = { 'shopping.txt': 'apples bread milk' }

type FromItem = { code?: string; files?: Record<string, string> } | null

export default function PlaygroundPage() {
  // "Open in Playground" passes an item's code (and files) in the navigation state.
  const location = useLocation()
  const navigate = useNavigate()
  const fromItem = location.state as FromItem
  // A permalink's code wins over the stored code, but not over an item just opened.
  const fromLink = decodeCode(location.hash)
  const code = fromItem?.code ?? fromLink ?? getProgress().playgroundCode ?? SAMPLE
  const files = fromItem?.code ? fromItem.files : SAMPLE_FILES
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)
  const copyLink = async (current: string) => {
    const url = `${window.location.origin}${window.location.pathname}${encodeCode(current)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied('yes')
    } catch {
      setCopied('no')
    }
    window.history.replaceState(window.history.state, '', url)
  }
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Playground</h1>
      <p className="text-slate-700">
        Python runs in your browser. The first run loads it, which takes a few seconds. A program that runs longer than 5 seconds is
        stopped (time spent waiting for you to type input doesn't count). Your code is kept in this browser.
      </p>
      {files && Object.keys(files).length > 0 && (
        <p className="text-sm text-slate-600">
          Files available to <code className="font-mono">open()</code>: {Object.keys(files).join(', ')}
        </p>
      )}
      <RunnerPanel
        key={location.key}
        initialCode={code}
        initialStdin={fromItem?.code || pythonRunner.interactive ? '' : 'Sam'}
        files={files}
        onCodeChange={(next) => {
          setPlaygroundCode(next)
          setCopied(null)
        }}
        renderActions={(current, stdin) => (
          <>
            <button
              type="button"
              onClick={() => navigate('/step', { state: { code: current, files, stdin } })}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              Step through
            </button>
            <button type="button" onClick={() => copyLink(current)} className="rounded border border-slate-300 px-3 py-2 text-sm">
              Copy link to this code
            </button>
            {copied === 'yes' && <span className="text-sm text-green-600">Link copied</span>}
            {copied === 'no' && <span className="text-sm text-slate-600">Copy the link from the address bar</span>}
          </>
        )}
      />
    </section>
  )
}
