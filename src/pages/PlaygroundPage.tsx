import { useLocation } from 'react-router'
import { RunnerPanel } from '../components/RunnerPanel'
import { getProgress, setPlaygroundCode } from '../progress/store'

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
  const fromItem = location.state as FromItem
  const code = fromItem?.code ?? getProgress().playgroundCode ?? SAMPLE
  const files = fromItem?.code ? fromItem.files : SAMPLE_FILES
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Playground</h1>
      <p className="text-slate-700">
        Python runs in your browser. The first run loads it, which takes a few seconds. A program that runs longer than 5 seconds is
        stopped. Your code is kept in this browser.
      </p>
      {files && Object.keys(files).length > 0 && (
        <p className="text-sm text-slate-600">
          Files available to <code className="font-mono">open()</code>: {Object.keys(files).join(', ')}
        </p>
      )}
      <RunnerPanel key={location.key} initialCode={code} initialStdin={fromItem?.code ? '' : 'Sam'} files={files} onCodeChange={setPlaygroundCode} />
    </section>
  )
}
