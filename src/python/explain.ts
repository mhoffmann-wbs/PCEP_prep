// Turns a Python error into a beginner explanation with a link to the lesson
// that covers it. Message patterns come first; the exception type is the fallback.
import type { PyError } from './runtime'

export interface Explanation {
  /** Stable key, used by tests. */
  key: string
  title: string
  text: string
  /** Lesson that explains the topic. */
  lessonId: string
}

/** Error type the client reports when it stops a program that runs too long. */
export const TIMEOUT_TYPE = 'Timeout'

type Rule = { key: string; type: string | string[]; match?: RegExp; title: string; text: (m: RegExpMatchArray) => string; lessonId?: string }

const RULES: Rule[] = [
  // SyntaxError and IndentationError
  {
    key: 'missing-colon',
    type: 'SyntaxError',
    match: /expected ':'/,
    title: 'Missing colon',
    text: () => 'Lines that start a block (if, elif, else, for, while, def, try, except, with) must end with a colon (:).',
    lessonId: '1.2.1',
  },
  {
    key: 'unclosed-bracket',
    type: 'SyntaxError',
    match: /'([([{])' was never closed/,
    title: 'Bracket never closed',
    text: (m) => `A "${m[1]}" is opened but never closed. Count the opening and closing brackets on that line and the lines around it.`,
    lessonId: '1.2.1',
  },
  {
    key: 'unterminated-string',
    type: 'SyntaxError',
    match: /unterminated (triple-quoted )?string literal/,
    title: 'String not closed',
    text: () => 'A string starts with a quote but never ends. Close it with the same kind of quote it started with.',
    lessonId: '3.5.1',
  },
  {
    key: 'cannot-assign',
    type: 'SyntaxError',
    match: /cannot assign to/,
    title: 'Cannot assign to this',
    text: () => 'Only a variable name (or an item or slice) can be on the left of =. Check that the name is on the left and the value on the right, and use == to compare.',
    lessonId: '1.3.2',
  },
  {
    key: 'assign-vs-compare',
    type: 'SyntaxError',
    match: /Maybe you meant '==' /,
    title: '= used where == was meant',
    text: () => 'A single = assigns a value. To compare two values, for example in an if condition, use ==.',
    lessonId: '1.4.1',
  },
  {
    key: 'invalid-syntax',
    type: 'SyntaxError',
    title: 'Invalid syntax',
    text: () =>
      'Python could not read this line. Look for a missing operator or comma, a misspelled keyword, or a keyword used as a variable name. The mistake is often just before the marked spot.',
    lessonId: '1.2.1',
  },
  {
    key: 'expected-indent',
    type: 'IndentationError',
    match: /expected an indented block/,
    title: 'Block is not indented',
    text: () => 'After a line ending with a colon, the next lines must be indented (4 spaces is the convention). Use pass for a block that should do nothing.',
    lessonId: '1.2.1',
  },
  {
    key: 'unexpected-indent',
    type: 'IndentationError',
    match: /unexpected indent/,
    title: 'Unexpected indent',
    text: () => 'This line is indented, but it does not belong to a block. Line it up with the code around it.',
    lessonId: '1.2.1',
  },
  {
    key: 'unindent-mismatch',
    type: ['IndentationError', 'TabError'],
    title: 'Inconsistent indentation',
    text: () => 'The indentation does not line up with any outer block. Use the same number of spaces for every line in a block, and do not mix tabs and spaces.',
    lessonId: '1.2.1',
  },
  // TypeError
  {
    key: 'concat-str',
    type: 'TypeError',
    match: /can only concatenate str \(not "(\w+)"\) to str/,
    title: 'Joining text and a number',
    text: (m) => `+ can join two strings, but here a string meets a value of type ${m[1]}. Convert it with str(), or use an f-string.`,
    lessonId: '1.4.2',
  },
  {
    key: 'unsupported-operand',
    type: 'TypeError',
    match: /unsupported operand type\(s\) for (.+): '(\w+)' and '(\w+)'/,
    title: 'Operator does not fit these types',
    text: (m) => `${m[1]} cannot combine a ${m[2]} with a ${m[3]}. Values from input() are strings: convert them with int() or float() first.`,
    lessonId: '1.4.2',
  },
  {
    key: 'missing-argument',
    type: 'TypeError',
    match: /missing (\d+) required positional argument/,
    title: 'Missing argument',
    text: () => 'The function was called with fewer arguments than it has parameters without default values.',
    lessonId: '4.1.3',
  },
  {
    key: 'too-many-arguments',
    type: 'TypeError',
    match: /takes (\d+) positional arguments? but (\d+) (were|was) given/,
    title: 'Too many arguments',
    text: (m) => `The function accepts ${m[1]} positional argument(s), but the call passed ${m[2]}.`,
    lessonId: '4.1.3',
  },
  {
    key: 'not-callable',
    type: 'TypeError',
    match: /'(\w+)' object is not callable/,
    title: 'Calling something that is not a function',
    text: (m) => `Parentheses after a name call it, but this value is a ${m[1]}. A variable may have the same name as a function (for example list = [1, 2]).`,
    lessonId: '4.1.1',
  },
  {
    key: 'item-assignment',
    type: 'TypeError',
    match: /'(str|tuple)' object does not support item assignment/,
    title: 'This value cannot be changed in place',
    text: (m) => `A ${m[1]} is immutable: its items cannot be replaced. Build a new ${m[1]} instead.`,
    lessonId: '3.2.1',
  },
  {
    key: 'none-subscript',
    type: 'TypeError',
    match: /'NoneType' object is not subscriptable/,
    title: 'Indexing None',
    text: () => 'The value is None, often because a function has no return statement or a method such as sort() changes a list and returns None.',
    lessonId: '4.1.2',
  },
  {
    key: 'not-supported-between',
    type: 'TypeError',
    match: /'([<>]=?)' not supported between instances of '(\w+)' and '(\w+)'/,
    title: 'Comparing values of different types',
    text: (m) => `${m[1]} cannot compare a ${m[2]} with a ${m[3]}. Convert one of them first.`,
    lessonId: '1.4.2',
  },
  // ValueError
  {
    key: 'invalid-literal',
    type: 'ValueError',
    match: /invalid literal for int\(\) with base 10: (.+)/,
    title: 'Text is not a whole number',
    text: (m) => `int() cannot turn ${m[1]} into a whole number. Check the input, and use float() for numbers with a decimal point.`,
    lessonId: '1.4.2',
  },
  {
    key: 'float-conversion',
    type: 'ValueError',
    match: /could not convert string to float/,
    title: 'Text is not a number',
    text: () => 'float() can only convert text that looks like a number, such as "3.5".',
    lessonId: '1.4.2',
  },
  {
    key: 'unpack',
    type: 'ValueError',
    match: /(not enough|too many) values to unpack/,
    title: 'Wrong number of values to unpack',
    text: () => 'The number of names on the left of = must match the number of values on the right.',
    lessonId: '3.2.1',
  },
  {
    key: 'not-in-list',
    type: 'ValueError',
    match: /not in list/,
    title: 'Value not in the list',
    text: () => 'index() and remove() fail when the value is not in the list. Test with in first.',
    lessonId: '3.1.2',
  },
  // Other common types
  {
    key: 'name-not-defined',
    type: 'NameError',
    match: /name '(\w+)' is not defined/,
    title: 'Unknown name',
    text: (m) =>
      `Python does not know the name ${m[1]}. Check the spelling and capitals, assign it before this line, and put quotes around it if you meant text.`,
  },
  {
    key: 'unbound-local',
    type: 'UnboundLocalError',
    title: 'Local variable used before it has a value',
    text: () =>
      'The function assigns to this name, so Python treats it as local in the whole function, and it is read before that assignment. Use the global keyword if you meant the global variable.',
    lessonId: '4.1.5',
  },
  {
    key: 'index-out-of-range',
    type: 'IndexError',
    match: /(\w+) index out of range/,
    title: 'Index out of range',
    text: (m) => `The ${m[1]} has no item at that index. Indexes start at 0, so the last one is len(...) - 1.`,
  },
  {
    key: 'key-missing',
    type: 'KeyError',
    title: 'Key not in the dictionary',
    text: () => 'The dictionary has no such key. Test with in first, or use get(), which returns None for a missing key.',
    lessonId: '3.4.1',
  },
  {
    key: 'zero-division',
    type: 'ZeroDivisionError',
    title: 'Division by zero',
    text: () => '/, // and % cannot divide by zero. Check the divisor before dividing.',
  },
  {
    key: 'none-attribute',
    type: 'AttributeError',
    match: /'NoneType' object has no attribute '(\w+)'/,
    title: 'Method called on None',
    text: () => 'The value is None, often because a function has no return statement or a method such as sort() returns None.',
    lessonId: '4.1.2',
  },
  {
    key: 'no-attribute',
    type: 'AttributeError',
    match: /'(\w+)' object has no attribute '(\w+)'/,
    title: 'No such method or attribute',
    text: (m) => `A ${m[1]} has no ${m[2]}. Check the spelling, and check which type the value really has.`,
  },
  {
    key: 'file-not-found',
    type: 'FileNotFoundError',
    title: 'File not found',
    text: () => 'There is no file with that name. Check the spelling, or open it with mode "w" or "a" to create it.',
    lessonId: '5.1.1',
  },
  {
    key: 'eof',
    type: 'EOFError',
    title: 'No more input',
    text: () => 'input() was called, but the input box has no more lines. Add one line to the input box for every input() call.',
    lessonId: '1.4.2',
  },
  {
    key: 'recursion',
    type: 'RecursionError',
    title: 'Function calls itself without end',
    text: () => 'A function kept calling itself until Python stopped it. Make sure it has a base case that returns without calling itself.',
    lessonId: 'x.5',
  },
  {
    key: 'timeout',
    type: TIMEOUT_TYPE,
    title: 'Program stopped: it ran too long',
    text: () => 'This is often an infinite loop: check that the loop condition can become false, for example that a while loop updates its variable.',
    lessonId: '2.2.1',
  },
]

const DEFAULT_LESSON = '4.2.1'

export function explainError(error: PyError): Explanation {
  for (const rule of RULES) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type]
    if (!types.includes(error.type)) continue
    const m = rule.match ? error.message.match(rule.match) : ([error.message] as RegExpMatchArray)
    if (m) return { key: rule.key, title: rule.title, text: rule.text(m), lessonId: rule.lessonId ?? DEFAULT_LESSON }
  }
  return {
    key: 'generic',
    title: error.type,
    text: 'Read the last line of the error first: it names the problem. The line number shows where Python noticed it.',
    lessonId: DEFAULT_LESSON,
  }
}
