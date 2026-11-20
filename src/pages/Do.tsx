import { RunnerPanel } from '../components/RunnerPanel'

const SAMPLE = `name = input("What is your name? ")
print("Hello,", name)

with open("shopping.txt") as f:
    items = f.read().split()
print("You need", len(items), "items")

with open("done.txt", "w") as f:
    f.write("bought: " + items[0] + "\\n")
`

export function Do() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Run Python</h1>
      <p className="text-slate-700">
        Python runs in your browser. The first run loads it, which takes a few seconds. A program that runs longer than 5 seconds is
        stopped.
      </p>
      <RunnerPanel initialCode={SAMPLE} initialStdin="Sam" files={{ 'shopping.txt': 'apples bread milk' }} />
    </section>
  )
}
