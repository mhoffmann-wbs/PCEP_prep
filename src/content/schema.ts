// Zod schema for question-bank items. Items live as JSON arrays in
// src/content/questions/<objectiveId>.json and are rendered generically.
// Cross-checks against the blueprint (objective and sub-point ids) live in the
// content tests, so this file stays independent of blueprint data.
import { z } from 'zod'

/** Marker line in `insert` items where the chosen option goes. */
export const INSERT_MARKER = '# >>> INSERT <<<'

/** Blank placeholders in `gap` item code: __BLANK1__, __BLANK2__, … */
export const BLANK_RE = /__BLANK(\d+)__/g

const OBJECTIVE_ID = /^(\d\.\d\.\d|x\.\d)$/

const nonEmpty = z.string().trim().min(1)

const option = z.object({
  text: nonEmpty,
  correct: z.boolean(),
  /** Why this option is right, or the tempting mistake behind it. */
  rationale: nonEmpty,
})

const base = {
  /** `${objectiveId}-NN`, e.g. "2.2.3-04". */
  id: z.string().regex(/^(\d\.\d\.\d|x\.\d)-\d{2}$/),
  objectiveId: z.string().regex(OBJECTIVE_ID),
  /** Sub-point ids this item tests, e.g. ["2.2.3.2"]. Drive the 30-02 filter. */
  subpoints: z.array(z.string()).min(1),
  stem: nonEmpty,
  /** Python shown with the stem. For gap/insert it contains the markers. */
  code: z.string().optional(),
  /**
   * Exact stdout of the complete program (for gap/insert/order: with the
   * correct answer filled in). Checked by running it in Pyodide; never
   * written from memory.
   */
  output: z.string().optional(),
  /** Exception type the complete program raises, e.g. "TypeError". */
  raises: z.string().regex(/^[A-Z]\w*$/).optional(),
  explanation: nonEmpty,
}

const single = z.object({
  ...base,
  kind: z.literal('single'),
  options: z.array(option).length(4),
  /** The correct option's text is the program's output (must equal `output`). */
  outputKey: z.boolean().optional(),
})

const COUNT_WORDS = ['', 'ONE', 'TWO', 'THREE', 'FOUR'] as const

const multi = z.object({
  ...base,
  kind: z.literal('multi'),
  /** How many options to pick; the stem must say "(Select TWO)" etc. */
  select: z.number().int().min(2).max(3),
  options: z.array(option).min(5).max(6),
})

const textBlank = z.object({
  n: z.number().int().positive(),
  kind: z.literal('text'),
  /** Accepted answers, compared whitespace-normalised. The first is canonical. */
  accept: z.array(nonEmpty).min(1),
  rationale: nonEmpty,
})

const choiceBlank = z.object({
  n: z.number().int().positive(),
  kind: z.literal('choice'),
  choices: z.array(nonEmpty).min(2),
  answer: nonEmpty,
  rationale: nonEmpty,
})

const gap = z.object({
  ...base,
  kind: z.literal('gap'),
  code: z.string().min(1),
  blanks: z.array(z.discriminatedUnion('kind', [textBlank, choiceBlank])).min(1),
})

const order = z.object({
  ...base,
  kind: z.literal('order'),
  /** `code`: the lines form a program; `values`: they are values to rank. */
  mode: z.enum(['code', 'values']),
  /** Lines in the correct order (shuffled when shown). Keep indentation. */
  lines: z.array(z.string().min(1)).min(3).max(8),
  /** Other accepted orders, as permutations of indexes into `lines`. */
  altOrders: z.array(z.array(z.number().int().nonnegative())).optional(),
  rationale: nonEmpty,
})

const insert = z.object({
  ...base,
  kind: z.literal('insert'),
  code: z.string().min(1),
  options: z.array(option).length(4),
})

export const itemSchema = z
  .discriminatedUnion('kind', [single, multi, gap, order, insert])
  .superRefine((item, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: 'custom', message, path })

    if (!item.id.startsWith(`${item.objectiveId}-`)) issue('id must start with objectiveId', ['id'])
    for (const [i, s] of item.subpoints.entries()) {
      if (!s.startsWith(`${item.objectiveId}.`)) issue(`sub-point ${s} is not under ${item.objectiveId}`, ['subpoints', i])
    }
    if (item.output !== undefined && item.raises !== undefined) issue('use either output or raises, not both')

    switch (item.kind) {
      case 'single': {
        const correct = item.options.filter((o) => o.correct)
        if (correct.length !== 1) issue('single needs exactly 1 correct option', ['options'])
        if (item.outputKey) {
          if (item.output === undefined) issue('outputKey needs output', ['output'])
          else if (correct[0] && correct[0].text.trimEnd() !== item.output.trimEnd())
            issue('correct option must equal output', ['options'])
        }
        break
      }
      case 'multi': {
        const correct = item.options.filter((o) => o.correct).length
        if (correct !== item.select) issue(`multi has ${correct} correct options, select is ${item.select}`, ['options'])
        if (!item.stem.includes(`(Select ${COUNT_WORDS[item.select]})`))
          issue(`stem must say "(Select ${COUNT_WORDS[item.select]})"`, ['stem'])
        break
      }
      case 'gap': {
        const inCode = [...item.code.matchAll(BLANK_RE)].map((m) => Number(m[1]))
        const declared = item.blanks.map((b) => b.n)
        const sorted = (a: number[]) => [...a].sort((x, y) => x - y).join(',')
        if (new Set(inCode).size !== inCode.length) issue('each blank may appear only once in code', ['code'])
        if (sorted(inCode) !== sorted(declared)) issue(`blanks in code (${inCode}) do not match blanks (${declared})`, ['blanks'])
        for (const [i, b] of item.blanks.entries()) {
          if (b.kind === 'choice' && !b.choices.includes(b.answer)) issue('answer must be one of choices', ['blanks', i])
        }
        break
      }
      case 'order': {
        const n = item.lines.length
        const identity = item.lines.map((_, i) => i).join(',')
        for (const [i, p] of (item.altOrders ?? []).entries()) {
          const ok = p.length === n && [...p].sort((a, b) => a - b).join(',') === identity
          if (!ok) issue('altOrders entry must be a permutation of line indexes', ['altOrders', i])
          if (p.join(',') === identity) issue('altOrders must not repeat the main order', ['altOrders', i])
        }
        break
      }
      case 'insert': {
        if (item.code.split(INSERT_MARKER).length !== 2) issue(`code must contain "${INSERT_MARKER}" exactly once`, ['code'])
        if (item.options.filter((o) => o.correct).length !== 1) issue('insert needs exactly 1 correct option', ['options'])
        if (item.output === undefined && item.raises === undefined) issue('insert needs the target output', ['output'])
        break
      }
    }
  })

export const itemFileSchema = z.array(itemSchema)

export type Item = z.infer<typeof itemSchema>
export type ItemKind = Item['kind']

/**
 * The complete program behind an item, with the correct answer filled in, or
 * null when the item has no code to run. Used to check `output`/`raises`.
 */
export function completeProgram(item: Item): string | null {
  switch (item.kind) {
    case 'gap':
      return item.code.replace(BLANK_RE, (_, n: string) => {
        const b = item.blanks.find((x) => x.n === Number(n))!
        return b.kind === 'text' ? b.accept[0]! : b.answer
      })
    case 'insert': {
      const line = item.code.split('\n').find((l) => l.includes(INSERT_MARKER))!
      const indent = line.slice(0, line.indexOf(INSERT_MARKER))
      return item.code.replace(INSERT_MARKER, item.options.find((o) => o.correct)!.text.split('\n').join(`\n${indent}`))
    }
    case 'order':
      return item.mode === 'code' ? item.lines.join('\n') : null
    default:
      return item.code ?? null
  }
}
