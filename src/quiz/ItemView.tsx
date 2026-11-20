import { type ReactNode, useState } from 'react'
import { OBJECTIVE_BY_ID } from '../content/blueprint'
import { BLANK_RE, INSERT_MARKER, type Item } from '../content/schema'
import { CodeBlock, Inline } from '../components/Inline'
import { type Response, blankCorrect } from './grade'
import { type ShortcutMap, useShortcuts } from './shortcuts'

const COUNT_WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE']
const LETTERS = 'ABCDEF'

interface Props {
  item: Item
  response: Response
  onChange: (response: Response) => void
  /** When true, inputs lock and the key, every rationale and the explanation are shown. */
  revealed?: boolean
  /** Select options with 1–6 or A–F. Only one ItemView on screen should enable this. */
  keyboard?: boolean
}

type Of<K extends Item['kind']> = Extract<Item, { kind: K }>

export function ItemView({ item, response, onChange, revealed = false, keyboard = false }: Props) {
  const objective = OBJECTIVE_BY_ID.get(item.objectiveId)!
  return (
    <article className="space-y-4" data-item-id={item.id}>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {objective.id} <Inline text={objective.title} />
        {objective.sectionId === 'x' && (
          <span className="ml-2 rounded bg-accent px-1.5 py-0.5 normal-case text-slate-900">30-02 only</span>
        )}
      </p>
      <p className="whitespace-pre-line text-lg leading-relaxed">
        <Inline text={item.stem} />
      </p>
      {item.kind === 'single' || item.kind === 'multi' ? (
        <>
          {item.code && <CodeBlock code={item.code} />}
          <Options item={item} response={response} onChange={onChange} revealed={revealed} keyboard={keyboard} />
        </>
      ) : item.kind === 'insert' ? (
        <>
          <InsertCode item={item} choice={response.kind === 'insert' ? response.choice : null} />
          <Options item={item} response={response} onChange={onChange} revealed={revealed} keyboard={keyboard} />
        </>
      ) : item.kind === 'gap' ? (
        <Gaps item={item} response={response} onChange={onChange} revealed={revealed} />
      ) : (
        <>
          {item.code && <CodeBlock code={item.code} />}
          <Order item={item} response={response} onChange={onChange} revealed={revealed} />
        </>
      )}
      {revealed && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-semibold">Explanation</h3>
          <p className="mt-1 whitespace-pre-line">
            <Inline text={item.explanation} />
          </p>
        </section>
      )}
    </article>
  )
}

function Options({ item, response, onChange, revealed, keyboard }: { item: Of<'single'> | Of<'multi'> | Of<'insert'> } & Omit<Props, 'item'>) {
  const multi = item.kind === 'multi'
  const selected = response.kind === 'multi' ? response.choices : 'choice' in response && response.choice !== null ? [response.choice] : []
  const asCode = item.kind === 'insert' || !!item.code

  function toggle(i: number) {
    if (revealed) return
    if (!multi) return onChange({ kind: item.kind as 'single' | 'insert', choice: i })
    if (selected.includes(i)) return onChange({ kind: 'multi', choices: selected.filter((s) => s !== i) })
    // Like the real exam, don't allow more selections than the item asks for.
    if (selected.length < item.select) onChange({ kind: 'multi', choices: [...selected, i] })
  }

  const keys: ShortcutMap = {}
  item.options.forEach((_, i) => {
    keys[String(i + 1)] = () => toggle(i)
    keys[LETTERS[i]!.toLowerCase()] = () => toggle(i)
  })
  useShortcuts(keys, !!keyboard && !revealed)

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-slate-600">{multi ? `Select ${COUNT_WORDS[item.select - 1]}.` : 'Select ONE.'}</legend>
      {item.options.map((option, i) => {
        const isSelected = selected.includes(i)
        const tone = !revealed
          ? isSelected
            ? 'border-brand bg-brand/5'
            : 'border-slate-200 bg-white hover:border-slate-400'
          : option.correct
            ? 'border-green-600 bg-green-50'
            : isSelected
              ? 'border-red-600 bg-red-50'
              : 'border-slate-200 bg-white opacity-80'
        return (
          <label key={i} className={`block cursor-pointer rounded-lg border-2 p-3 transition-colors ${tone}`}>
            <span className="flex gap-3">
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={item.id}
                checked={isSelected}
                disabled={revealed}
                onChange={() => toggle(i)}
                className="mt-1 accent-brand"
              />
              <span className="font-semibold">{LETTERS[i]}.</span>
              {asCode ? <span className="whitespace-pre-wrap font-mono text-sm">{option.text}</span> : <span><Inline text={option.text} /></span>}
            </span>
            {revealed && (
              <span className="mt-2 block pl-7 text-sm text-slate-700">
                <span className="font-semibold">{option.correct ? '✓ ' : '✗ '}</span>
                <Inline text={option.rationale} />
              </span>
            )}
          </label>
        )
      })}
    </fieldset>
  )
}

/** The program with the insertion point marked, showing the chosen line once picked. */
function InsertCode({ item, choice }: { item: Of<'insert'>; choice: number | null }) {
  const [before, after] = item.code.split(INSERT_MARKER) as [string, string]
  const chosen = choice !== null ? item.options[choice]?.text : null
  return (
    <CodeBlock>
      {before}
      <span className="rounded bg-accent/30 px-1 outline-1 outline-dashed outline-accent" aria-label="insertion point">
        {chosen ?? '▸ which line goes here?'}
      </span>
      {after}
    </CodeBlock>
  )
}

function Gaps({ item, response, onChange, revealed }: { item: Of<'gap'> } & Omit<Props, 'item' | 'keyboard'>) {
  const values = response.kind === 'gap' ? response.values : {}
  const set = (n: number, v: string) => onChange({ kind: 'gap', values: { ...values, [n]: v } })
  const parts: ReactNode[] = []
  let last = 0
  for (const m of item.code.matchAll(BLANK_RE)) {
    parts.push(item.code.slice(last, m.index))
    const n = Number(m[1])
    const blank = item.blanks.find((b) => b.n === n)!
    const tone = !revealed ? 'border-accent' : blankCorrect(item, n, values[n]) ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'
    const common = { 'aria-label': `Blank ${n}`, disabled: revealed, className: `rounded border-2 bg-white px-1 font-mono text-sm text-slate-900 ${tone}` }
    parts.push(
      blank.kind === 'choice' ? (
        <select key={n} value={values[n] ?? ''} onChange={(e) => set(n, e.target.value)} {...common}>
          <option value="">…</option>
          {blank.choices.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      ) : (
        <input
          key={n}
          value={values[n] ?? ''}
          onChange={(e) => set(n, e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          size={Math.max(6, (values[n] ?? '').length + 1)}
          {...common}
        />
      ),
    )
    last = m.index! + m[0].length
  }
  parts.push(item.code.slice(last))
  return (
    <div className="space-y-3">
      <CodeBlock>{parts}</CodeBlock>
      {revealed && (
        <ul className="space-y-1 text-sm">
          {item.blanks.map((b) => (
            <li key={b.n}>
              <span className="font-semibold">{blankCorrect(item, b.n, values[b.n]) ? '✓' : '✗'} Blank {b.n}: </span>
              <code className="font-mono">{b.kind === 'choice' ? b.answer : b.accept.join('  or  ')}</code> · <Inline text={b.rationale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Order({ item, response, onChange, revealed }: { item: Of<'order'> } & Omit<Props, 'item' | 'keyboard'>) {
  const order = response.kind === 'order' ? response.order : item.lines.map((_, i) => i)
  const [dragging, setDragging] = useState<number | null>(null)
  const move = (from: number, to: number) => {
    if (revealed || to < 0 || to >= order.length || from === to) return
    const next = [...order]
    const [line] = next.splice(from, 1)
    next.splice(to, 0, line!)
    onChange({ kind: 'order', order: next })
  }
  const mono = item.mode === 'code'
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-600">Drag the {mono ? 'lines' : 'values'} into order, or use the arrow buttons.</p>
      <ol className="space-y-1">
        {order.map((lineIndex, pos) => (
          <li
            key={lineIndex}
            draggable={!revealed}
            onDragStart={() => setDragging(pos)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging !== null) move(dragging, pos)
              setDragging(null)
            }}
            className={`flex items-center gap-2 rounded border-2 bg-white px-2 py-1 ${
              revealed ? 'border-slate-200' : 'cursor-grab border-slate-200 hover:border-slate-400'
            } ${dragging === pos ? 'opacity-50' : ''}`}
          >
            <span className="w-5 text-right text-xs text-slate-500">{pos + 1}</span>
            <span className={`flex-1 whitespace-pre ${mono ? 'font-mono text-sm' : ''}`}>{item.lines[lineIndex]}</span>
            {!revealed && (
              <span className="flex gap-1">
                <button type="button" aria-label={`Move line ${pos + 1} up`} disabled={pos === 0} onClick={() => move(pos, pos - 1)} className="rounded border px-2 disabled:opacity-30">
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move line ${pos + 1} down`}
                  disabled={pos === order.length - 1}
                  onClick={() => move(pos, pos + 1)}
                  className="rounded border px-2 disabled:opacity-30"
                >
                  ↓
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {revealed && (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Correct order:</p>
          {mono ? <CodeBlock code={item.lines.join('\n')} /> : <p>{item.lines.join(' → ')}</p>}
          <p>
            <Inline text={item.rationale} />
          </p>
        </div>
      )}
    </div>
  )
}
