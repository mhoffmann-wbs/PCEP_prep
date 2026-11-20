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
  /** Files in the working directory when the code runs, e.g. {"notes.txt": "..."}. */
  files: z.record(z.string(), z.string()).optional(),
  /**
   * Exception type the complete program raises, e.g. "TypeError". With `output`
   * too, `output` is what the program prints before the exception.
   */
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
    if (/\boutput\b/i.test(item.stem) && item.output === undefined && item.raises === undefined)
      issue('stem asks for the output: set output or raises so it is checked in Pyodide', ['output'])

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

/** `export const meta` of each lessons/<objectiveId>.mdx file. Titles come from the blueprint. */
export const lessonMetaSchema = z.object({
  objectiveId: z.string().regex(OBJECTIVE_ID),
  /** Date the lesson was last checked against the syllabus. */
  updated: z.iso.date(),
  /** One or two sentences: what the learner must take away. */
  tldr: nonEmpty,
  /** Sub-point ids the lesson teaches; a content test requires all of the objective's. */
  subpointsCovered: z.array(z.string()).min(1),
  /** Optional links to the official Python documentation or PEPs. */
  links: z.array(z.object({ title: nonEmpty, url: z.url().regex(/^https:\/\/(docs|peps)\.python\.org\//) })).default([]),
})

export type LessonMeta = z.infer<typeof lessonMetaSchema>

const functionCheck = z
  .object({
    /** Python expression evaluated in the learner's globals, e.g. `average([2, 4])`. */
    call: nonEmpty,
    /** Python expression for the expected value; the result must be equal and of the same type. */
    expect: nonEmpty.optional(),
    /** What the call must print (compared line by line, ignoring trailing spaces). */
    prints: z.string().optional(),
    /** Exception type the call must raise. */
    raises: z.string().regex(/^[A-Z]\w*$/).optional(),
  })
  .refine((c) => c.expect !== undefined || c.prints !== undefined || c.raises !== undefined, 'a check needs expect, prints or raises')

const ioCase = z.object({
  /** Lines fed to input(), one per line. */
  stdin: z.string().default(''),
  /** What the program must print (compared line by line, ignoring trailing spaces). */
  stdout: z.string(),
  /** Files the program must have written, with their exact text. */
  writes: z.record(z.string(), z.string()).optional(),
})

const exerciseBase = {
  /** `${objectiveId}-e<n>`, e.g. "3.1.1-e1". */
  id: z.string().regex(/^(\d\.\d\.\d|x\.\d)-e\d$/),
  objectiveId: z.string().regex(OBJECTIVE_ID),
  /** Sub-point ids the exercise practises. Drive the 30-02 filter, as for items. */
  subpoints: z.array(z.string()).min(1),
  title: nonEmpty,
  /** The task. Paragraphs are separated by blank lines; `backticks` mark code. */
  prompt: nonEmpty,
  /** Code the editor starts with. It must not already pass. */
  starter: z.string(),
  /** A model solution; a content test runs it against the checks. */
  solution: nonEmpty,
  /** Revealed one at a time, from a gentle nudge to nearly the answer. */
  hints: z.array(nonEmpty).min(1).max(3),
  /** Files in the working directory when the program runs. */
  files: z.record(z.string(), z.string()).optional(),
}

const functionExercise = z.object({
  ...exerciseBase,
  /** The learner writes a function; checks call it. */
  kind: z.literal('function'),
  checks: z.array(functionCheck).min(2),
})

const ioExercise = z.object({
  ...exerciseBase,
  /** The learner writes a program; each case feeds stdin and compares stdout. */
  kind: z.literal('io'),
  cases: z.array(ioCase).min(1),
})

export const exerciseSchema = z.discriminatedUnion('kind', [functionExercise, ioExercise]).superRefine((ex, ctx) => {
  if (!ex.id.startsWith(`${ex.objectiveId}-`)) ctx.addIssue({ code: 'custom', message: 'id must start with objectiveId', path: ['id'] })
  for (const [i, s] of ex.subpoints.entries()) {
    if (!s.startsWith(`${ex.objectiveId}.`)) ctx.addIssue({ code: 'custom', message: `sub-point ${s} is not under ${ex.objectiveId}`, path: ['subpoints', i] })
  }
})

export const exerciseFileSchema = z.array(exerciseSchema)

export type Exercise = z.infer<typeof exerciseSchema>

/** `export const meta` of each guides/<slug>.mdx file (cheat sheet, exam-day guide). */
export const guideMetaSchema = z.object({
  slug: z.string().regex(/^[a-z-]+$/),
  title: nonEmpty,
  /** Date the guide was last checked against the syllabus and exam pages. */
  updated: z.iso.date(),
  summary: nonEmpty,
})

export type GuideMeta = z.infer<typeof guideMetaSchema>

/**
 * A built-in flashcard (flashcards/<objectiveId>.json). `front` asks, `back`
 * answers; both use `backticks` for code and blank lines between paragraphs.
 * `code` is shown under the question. `output`/`raises` say what `code` prints
 * or raises; the content tests check them in Pyodide, so never write them by hand.
 */
export const cardSchema = z
  .object({
    /** `${objectiveId}-c<nn>`, e.g. "3.1.1-c01", numbered in file order. */
    id: z.string().regex(/^(\d\.\d\.\d|x\.\d)-c\d{2}$/),
    objectiveId: z.string().regex(OBJECTIVE_ID),
    /** Sub-point ids the card covers. Drive the 30-02 filter, as for items. */
    subpoints: z.array(z.string()).min(1),
    front: nonEmpty,
    code: nonEmpty.optional(),
    back: nonEmpty,
    output: z.string().optional(),
    raises: z.string().regex(/^[A-Z]\w*$/).optional(),
  })
  .superRefine((card, ctx) => {
    if (!card.id.startsWith(`${card.objectiveId}-`)) ctx.addIssue({ code: 'custom', message: 'id must start with objectiveId', path: ['id'] })
    for (const [i, s] of card.subpoints.entries()) {
      if (!s.startsWith(`${card.objectiveId}.`)) ctx.addIssue({ code: 'custom', message: `sub-point ${s} is not under ${card.objectiveId}`, path: ['subpoints', i] })
    }
    if ((card.output !== undefined || card.raises) && !card.code) ctx.addIssue({ code: 'custom', message: 'output and raises need code', path: ['code'] })
  })

export const cardFileSchema = z.array(cardSchema)

export type Card = z.infer<typeof cardSchema>
