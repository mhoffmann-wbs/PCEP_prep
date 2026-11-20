// Detects Python features in code that only one of the two exams teaches, so a
// question (or lesson snippet) shown on one track never relies on a topic that
// track's syllabus leaves out.
import type { ExamId } from './blueprint'

export type Feature =
  // PCEP-30-03 only
  | 'walrus'
  | 'f-string'
  | 'format()'
  | 'set'
  | '*args/**kwargs'
  | 'files'
  | 'csv/math/random'
  // PCEP-30-02 only
  | 'bitwise'
  | 'loop else'
  | 'comprehension'
  | 'generator'
  | 'recursion'
  | 'numeral prefix'
  | 'scientific notation'

/** The only exam that teaches each feature. */
export const FEATURE_EXAM: Record<Feature, ExamId> = {
  walrus: '30-03',
  'f-string': '30-03',
  'format()': '30-03',
  set: '30-03',
  '*args/**kwargs': '30-03',
  files: '30-03',
  'csv/math/random': '30-03',
  bitwise: '30-02',
  'loop else': '30-02',
  comprehension: '30-02',
  generator: '30-02',
  recursion: '30-02',
  'numeral prefix': '30-02',
  'scientific notation': '30-02',
}

/** Removes string literals (keeping f-string prefixes visible) and comments. */
function stripStrings(code: string): string {
  return code
    .replace(/("""|''')[\s\S]*?\1/g, '""')
    .replace(/((?:\b[rRbBfF]{1,2})?)("([^"\\\n]|\\.)*"|'([^'\\\n]|\\.)*')/g, (_, prefix: string) => `${prefix}""`)
    .replace(/#.*$/gm, '')
}

function hasLoopElse(code: string): boolean {
  const openers: { indent: number; word: string }[] = []
  for (const line of code.split('\n')) {
    if (!line.trim()) continue
    const indent = line.length - line.trimStart().length
    while (openers.length && openers.at(-1)!.indent > indent) openers.pop()
    const word = line.trim().match(/^(if|elif|else|for|while|try|except|finally|with|def)\b/)?.[1]
    if (word === 'else') {
      const opener = [...openers].reverse().find((o) => o.indent === indent)
      if (opener && (opener.word === 'for' || opener.word === 'while')) return true
    }
    if (word && line.trimEnd().endsWith(':')) {
      while (openers.length && openers.at(-1)!.indent >= indent) openers.pop()
      openers.push({ indent, word: word === 'elif' ? 'if' : word })
    }
  }
  return false
}

function hasRecursion(code: string): boolean {
  const lines = code.split('\n')
  return lines.some((line, i) => {
    const def = line.match(/^(\s*)def (\w+)\(/)
    if (!def) return false
    const [, indent, name] = def as unknown as [string, string, string]
    for (const body of lines.slice(i + 1)) {
      if (body.trim() && body.length - body.trimStart().length <= indent.length) break
      if (new RegExp(`\\b${name}\\(`).test(body)) return true
    }
    return false
  })
}

export function detectFeatures(source: string): Set<Feature> {
  const code = stripStrings(source)
  const found = new Set<Feature>()
  const add = (f: Feature, test: boolean) => test && found.add(f)
  add('walrus', /:=/.test(code))
  add('f-string', /\b[rR]?[fF][rR]?""/.test(code))
  add('format()', /""\.format\(/.test(code))
  add('set', /\bset\(|\.(add|discard)\(/.test(code))
  add('*args/**kwargs', /\bdef \w+\([^)]*\*/.test(code))
  add('files', /\bopen\(/.test(code))
  add('csv/math/random', /\b(import|from)\s+(csv|math|random)\b/.test(code))
  add('bitwise', /[^&]&[^&=]|[^|]\|[^|=]|\^|~|<<|>>/.test(code))
  add('loop else', hasLoopElse(source))
  // A `for … in` that doesn't start its line is a comprehension or generator expression.
  add('comprehension', /^[ \t]*\S.*\bfor\s+\w+(\s*,\s*\w+)*\s+in\b/m.test(code))
  add('generator', /\byield\b/.test(code))
  add('recursion', hasRecursion(code))
  add('numeral prefix', /\b0[bBoOxX][0-9a-fA-F_]|\b(bin|oct|hex)\(/.test(code))
  add('scientific notation', /\b\d+(\.\d*)?[eE][+-]?\d+\b/.test(code))
  return found
}

/** The objectives that teach each feature; their lessons may use it on any track. */
export const FEATURE_HOME: Record<Feature, string[]> = {
  walrus: ['2.2.1'],
  'f-string': ['3.5.3'],
  'format()': ['3.5.3'],
  set: ['3.3.1'],
  '*args/**kwargs': ['4.1.4'],
  files: ['5.1.1', '5.1.2'],
  'csv/math/random': ['5.1.2', '5.2.1', '5.2.2', '5.2.3'],
  bitwise: ['x.2'],
  'loop else': ['x.3'],
  comprehension: ['x.4'],
  generator: ['x.5'],
  recursion: ['x.5'],
  'numeral prefix': ['x.1'],
  'scientific notation': ['x.1'],
}

/** Features in `source` that `exam` does not teach. */
export const foreignFeatures = (source: string, exam: ExamId): Feature[] => [...detectFeatures(source)].filter((f) => FEATURE_EXAM[f] !== exam)
