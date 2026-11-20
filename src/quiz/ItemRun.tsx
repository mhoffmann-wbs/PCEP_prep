import { useState } from 'react'
import { useNavigate } from 'react-router'
import { RunnerPanel } from '../components/RunnerPanel'
import { type Item, completeProgram } from '../content/schema'

/** The program behind an item, with the correct answer filled in. */
export const itemProgram = (item: Item) => completeProgram(item) ?? item.code ?? null

/**
 * Run / Open-in-Playground for an item's code. Practice shows this only after the
 * answer has been checked; the mock exam never shows it.
 */
export function ItemRun({ item }: { item: Item }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const program = itemProgram(item)
  if (!program) return null
  const filled = item.kind === 'gap' || item.kind === 'insert' || item.kind === 'order'
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="rounded border border-brand px-3 py-1.5 text-sm text-brand-dark">
            {filled ? 'Run the completed code' : 'Run this code'}
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/playground', { state: { code: program, files: item.files } })}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        >
          Open in Playground
        </button>
      </div>
      {open && <RunnerPanel key={item.id} initialCode={program} files={item.files} autoRun />}
    </section>
  )
}
