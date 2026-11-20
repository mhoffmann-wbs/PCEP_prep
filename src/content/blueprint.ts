// PCEP exam blueprint: the single source of truth for sections, weights,
// objectives and sub-points. Core objective titles and sub-points are verbatim
// from the PCEP-30-03 syllabus (blueprint v1.5, revised 2026-11-02):
// https://pythoninstitute.org/pcep-exam-syllabus
// If the syllabus changes, update this file first.
//
// Exam tags: an objective or sub-point without `exams` belongs to both exams.
// `exams: ['30-03']` marks topics that PCEP-30-02 does not cover; the extra
// objectives x.1–x.6 (`exams: ['30-02']`) cover what only PCEP-30-02 has.
// Tags were checked against both syllabi on 2026-11-20.

export type ExamId = '30-03' | '30-02'

export const EXAM_IDS: readonly ExamId[] = ['30-03', '30-02']

export const PE1_URL = 'https://edube.org/study/pe1'

export interface Subpoint {
  /** `${objectiveId}.${n}`, e.g. "2.2.1.5" */
  id: string
  text: string
  exams?: ExamId[]
}

export interface Objective {
  /** Syllabus id, e.g. "2.2.3", or "x.1" for a 30-02 extra. */
  id: string
  /** 30-03 section number ("1"–"5"), or "x" for the 30-02 extras. */
  sectionId: string
  /** Syllabus sub-group, e.g. "2.2" ("Iterative Execution"). */
  groupId: string
  title: string
  subpoints: Subpoint[]
  exams?: ExamId[]
  /** For extras: the PCEP-30-02 objectives the topic comes from. */
  source?: string
}

export interface Section {
  id: string
  title: string
  /** Blueprint scoring weight in percent (not a question-count share). */
  weight: number
  /** Number of exam items. */
  items: number
  objectiveIds: string[]
}

export interface ExamProfile {
  id: ExamId
  name: string
  syllabusUrl: string
  items: number
  minutes: number
  passPercent: number
  sections: Section[]
}

type RawObjective = { id: string; title: string; subpoints: (string | [string, ExamId[]])[]; exams?: ExamId[]; source?: string }

const sub = (text: string, exams: ExamId[]): [string, ExamId[]] => [text, exams]

const RAW: Record<string, RawObjective[]> = {
  '1': [
    {
      id: '1.1.1',
      title: 'Explain the fundamental concepts of programming language structure and code execution',
      subpoints: [
        'Define lexis, syntax, and semantics, and explain their roles in a programming language.',
        'Distinguish between lexical, syntactic, and semantic errors in program code.',
        'Define interpretation and compilation, and explain the roles of an interpreter and a compiler.',
        'Compare interpreted and compiled execution models, including how source code is processed and executed.',
        'Explain how Python source code is processed and executed, from source code to program execution.',
      ],
    },
    {
      id: '1.2.1',
      title: 'Apply the fundamental structural rules of Python programs',
      subpoints: [
        'Recognize Python keywords and explain why they cannot be used as identifiers.',
        'Distinguish between expressions, statements, and keywords.',
        'Use indentation to define blocks of code.',
        'Recognize errors caused by incorrect or inconsistent indentation.',
        'Use comments to document code and temporarily disable selected lines of code.',
      ],
    },
    {
      id: '1.3.1',
      title: 'Represent data using Python literals',
      subpoints: [
        'Recognize the basic Python data types represented by literals, including `int`, `float`, `str`, and `bool`.',
        'Use Boolean literals to represent logical values.',
        'Use integer and floating-point literals to represent numeric values.',
        'Explain limitations in the accuracy and representation of floating-point numbers.',
        'Construct string literals using appropriate quotation marks.',
      ],
    },
    {
      id: '1.3.2',
      title: 'Create and manage variables according to Python naming conventions',
      subpoints: [
        'Create variables and assign values.',
        'Explain how variables reference values during program execution.',
        'Select valid and meaningful variable names.',
        'Distinguish between valid and invalid Python identifiers.',
        'Apply relevant PEP 8 recommendations to variable names and assignment statements.',
      ],
    },
    {
      id: '1.4.1',
      title: 'Use operators and expressions',
      subpoints: [
        'Use numeric operators, including `**`, `*`, `/`, `%`, `//`, `+`, and `-`.',
        'Use `+` and `*` with strings where appropriate.',
        'Use assignment and augmented assignment operators.',
        'Distinguish between unary and binary operators.',
        'Apply operator precedence, associativity, and binding rules.',
        'Use the Boolean operators `not`, `and`, and `or`.',
        'Construct and evaluate Boolean expressions.',
        'Use relational operators, including `==`, `!=`, `>`, `>=`, `<`, and `<=`.',
      ],
    },
    {
      id: '1.4.2',
      title: 'Perform console I/O operations and type conversions',
      subpoints: [
        'Display values using the `print()` function.',
        'Read user input using the `input()` function.',
        'Explain that the `input()` function returns a string.',
        'Convert values between compatible data types using functions such as `int()`, `float()`, and `str()`.',
        'Convert input values to appropriate data types before processing them.',
        'Combine console input, data conversion, processing, and output in a simple program.',
      ],
    },
  ],
  '2': [
    {
      id: '2.1.1',
      title: 'Control program flow using `if` and `if-else` statements',
      subpoints: [
        'Use an `if` statement to execute code when a condition is true.',
        'Use an `if-else` structure to select between two execution paths.',
        'Construct conditions using Boolean expressions.',
        'Trace which branch is executed based on the result of a condition.',
        'Recognize when a conditional block is skipped.',
      ],
    },
    {
      id: '2.1.2',
      title: 'Select among multiple execution paths using `if-elif-else` statements',
      subpoints: [
        'Use an `if-elif` structure to evaluate multiple conditions.',
        'Use an `if-elif-else` structure to provide a fallback execution path.',
        'Explain that conditions are evaluated in order until a matching branch is found.',
        'Trace the execution of multi-branch conditional structures.',
        'Recognize incorrectly ordered, redundant, or unreachable conditional branches.',
      ],
    },
    {
      id: '2.1.3',
      title: 'Construct compound and nested conditional structures',
      subpoints: [
        'Use multiple conditional statements within the same program.',
        'Nest conditional statements inside other conditional branches.',
        'Combine Boolean expressions within conditional structures.',
        'Trace the execution of compound conditional structures.',
        'Identify unreachable, redundant, or incorrectly ordered conditional branches.',
      ],
    },
    {
      id: '2.2.1',
      title: 'Create condition-controlled loops using `while`',
      subpoints: [
        'Use a `while` loop to repeat instructions while a condition remains true.',
        'Initialize and update loop-control variables (sentinel values).',
        'Trace the execution of a condition-controlled loop.',
        'Recognize conditions that may result in an infinite loop.',
        sub('Use assignment expressions with the walrus operator `:=` where appropriate.', ['30-03']),
      ],
    },
    {
      id: '2.2.2',
      title: 'Iterate through sequences and iterable objects using `for` and `in`',
      subpoints: [
        'Use a `for` loop to iterate through a sequence or iterable object.',
        'Use the `in` operator to retrieve successive elements from an iterable.',
        'Iterate through common iterable objects such as strings, lists, and tuples.',
        'Process each element of an iterable within a loop.',
        'Trace the values assigned to the loop variable during execution.',
      ],
    },
    {
      id: '2.2.3',
      title: 'Generate numeric iterations using `range()`',
      subpoints: [
        'Use `range()` to generate integer sequences for loop iteration.',
        'Use the start, stop, and step arguments of `range()`.',
        'Use positive and negative step values.',
        'Trace the values produced by `range()` during loop execution.',
      ],
    },
    {
      id: '2.2.4',
      title: 'Construct nested loops and combined control structures',
      subpoints: [
        'Nest one loop inside another loop.',
        'Combine loops with conditional statements.',
        'Trace the execution order of nested loops.',
        'Use nested loops to process multidimensional or grouped data.',
      ],
    },
    {
      id: '2.2.5',
      title: 'Control loop execution using `break`, `continue`, and `pass`',
      subpoints: [
        'Use `break` to terminate a loop before its normal completion.',
        'Use `continue` to skip the remainder of the current iteration.',
        'Use `pass` as a syntactic placeholder for an empty block.',
        'Trace loops that contain `break`, `continue`, or `pass`.',
      ],
    },
  ],
  '3': [
    {
      id: '3.1.1',
      title: 'Construct lists and access their elements',
      subpoints: [
        'Create empty and populated lists.',
        'Store values of the same or different data types in a list.',
        'Access list elements using positive and negative indexes.',
        'Extract portions of a list using slicing.',
        'Use slice start, stop, and step values.',
        'Create copies of lists using slicing.',
      ],
    },
    {
      id: '3.1.2',
      title: 'Modify, search, sort, and iterate through lists',
      subpoints: [
        'Add elements using methods such as `append()` and `insert()`.',
        'Locate elements using methods such as `index()`.',
        'Remove list elements using appropriate methods or the `del` keyword.',
        'Sort list data using the `sorted()` function and relevant list methods.',
        'Iterate through list elements using a `for` loop.',
        'Initialize and update values while processing a list.',
        'Use the `in` and `not in` operators to test list membership.',
        'Determine the number of elements in a list using the `len()` function.',
      ],
    },
    {
      id: '3.1.3',
      title: 'Create, access, and modify multidimensional lists',
      subpoints: [
        'Use lists of lists to represent two-dimensional structures such as matrices.',
        'Use deeper levels of nesting to represent three-dimensional structures such as cubes.',
        'Access elements in multidimensional lists using multiple indexes.',
        'Modify values stored in nested lists.',
      ],
    },
    {
      id: '3.2.1',
      title: 'Construct, access, and use tuples effectively',
      subpoints: [
        'Create empty, single-element, and multi-element tuples.',
        'Access tuple elements using positive and negative indexes, and extract portions of tuples using slicing.',
        'Explain tuple immutability and compare the characteristics and common use cases of tuples and lists.',
        'Create nested tuples and lists by storing one collection inside another.',
        'Access elements within nested tuples using appropriate indexing.',
      ],
    },
    {
      id: '3.3.1',
      title: 'Collect and process unique values using sets',
      exams: ['30-03'],
      subpoints: [
        'Explain the defining characteristics of the `set` data type.',
        'Create empty and populated sets.',
        'Explain why sets do not preserve positional indexing.',
        'Add elements to a set.',
        'Remove elements from a set using appropriate methods.',
        'Test membership using the `in` and `not in` operators.',
      ],
    },
    {
      id: '3.4.1',
      title: 'Construct, modify, and process dictionary data',
      subpoints: [
        'Create empty and populated dictionaries containing key-value pairs.',
        'Access dictionary values using keys, and use the `in` and `not in` operators to determine whether a key exists.',
        'Add new key-value pairs and update values associated with existing keys.',
        'Remove key-value pairs.',
        'Iterate through dictionaries, including their keys, values, and key-value pairs using the `keys()`, `values()`, and `items()` methods.',
      ],
    },
    {
      id: '3.5.1',
      title: 'Construct strings and access their contents',
      subpoints: [
        'Create strings using single quotation marks, double quotation marks, and triple quotation marks.',
        'Use escape sequences introduced by the backslash character.',
        'Include quotation marks and apostrophes inside string literals.',
        'Create multiline strings.',
        'Access characters using positive and negative indexes.',
        'Extract substrings using slicing.',
        'Use slice start, stop, and step values with strings.',
        'Explain string immutability.',
        'Determine the length of a string using the `len()` function.',
        'Use the `in` and `not in` operators to test whether a substring is present.',
      ],
    },
    {
      id: '3.5.2',
      title: 'Process and transform strings',
      subpoints: [
        'Change letter case using `lower()`, `upper()`, `capitalize()`, `title()`, and `swapcase()`.',
        'Search for characters or substrings using `find()`.',
        'Split strings into substrings using `split()`.',
        'Join multiple strings using `join()`.',
        'Remove whitespace or selected characters from string boundaries using `strip()`, `lstrip()`, and `rstrip()`.',
        'Replace selected characters or substrings using `replace()`.',
        'Recognize that string methods return new strings rather than modifying the original string.',
      ],
    },
    {
      id: '3.5.3',
      title: 'Format values as strings',
      exams: ['30-03'],
      subpoints: [
        'Construct formatted string literals using f-strings.',
        'Insert variables and expressions into f-string replacement fields enclosed in `{}`.',
        'Recognize basic formatting performed using the `format()` method.',
        'Recognize basic legacy string formatting performed using the `%` operator.',
      ],
    },
  ],
  '4': [
    {
      id: '4.1.1',
      title: 'Define and invoke user-defined functions',
      subpoints: [
        'Explain how functions support code decomposition, reuse, and maintainability.',
        'Define a function using the `def` keyword.',
        'Create valid function names according to Python naming rules.',
        'Define a function body using correct indentation.',
        'Invoke a user-defined function.',
        'Trace the order in which function definitions and function calls are executed.',
      ],
    },
    {
      id: '4.1.2',
      title: 'Return values from functions',
      subpoints: [
        'Use the `return` statement to return a result from a function.',
        'Assign a returned value to a variable.',
        'Use returned values in expressions and function calls.',
        'Explain the difference between returning a value and displaying a value with `print()`.',
        'Explain how `return` terminates the current function call.',
        'Return multiple values from a function.',
        'Recognize when a function implicitly returns `None`.',
        'Use the `None` value to represent the absence of a meaningful result.',
      ],
    },
    {
      id: '4.1.3',
      title: 'Define parameters and pass arguments to functions',
      subpoints: [
        'Distinguish between parameters in function definitions and arguments in function calls.',
        'Pass arguments by position and keyword, and combine them in the correct order.',
        'Define parameters with default values.',
        'Call functions using default values or override them with explicit arguments.',
        'Use keyword arguments with built-in functions such as `print()`, including `sep` and `end`.',
        'Recognize invalid function calls caused by missing, duplicated, or incorrectly ordered arguments.',
      ],
    },
    {
      id: '4.1.4',
      title: 'Accept variable numbers of arguments',
      exams: ['30-03'],
      subpoints: [
        'Use `*args` to collect additional positional arguments.',
        'Explain that `*args` stores collected arguments in a tuple.',
        'Iterate through values received through `*args`.',
        'Use `**kwargs` to collect additional keyword arguments.',
        'Explain that `**kwargs` stores collected arguments in a dictionary.',
        'Access and process keys and values received through `**kwargs`.',
        'Combine standard parameters, default parameters, `*args`, and `**kwargs` in a valid function definition.',
      ],
    },
    {
      id: '4.1.5',
      title: 'Manage variable scope',
      subpoints: [
        'Distinguish between local and global name scopes.',
        'Explain how names created inside a function are resolved.',
        'Recognize namespaces and variable shadowing.',
        'Use the `global` keyword to modify a global variable from inside a function.',
        'Explain the risks associated with excessive use of global variables.',
      ],
    },
    {
      id: '4.2.1',
      title: 'Explain and recognize basic Python exceptions',
      subpoints: [
        'Explain the purpose of exceptions in Python programs.',
        'Explain how an exception interrupts the flow of program execution.',
        'Recognize common situations in which Python raises exceptions.',
        'Recognize basic built-in exceptions, including `ValueError`, `TypeError`, `ZeroDivisionError`, `IndexError`, `KeyError`, and `NameError`.',
        'Relate common exception types to the operations that may cause them.',
      ],
    },
    {
      id: '4.2.2',
      title: 'Handle runtime exceptions with `try` and `except`',
      subpoints: [
        'Use `try` and `except` to handle runtime exceptions.',
        'Handle specific exception types using one or more `except` branches.',
        'Use multiple `except` branches to handle different exception types.',
        'Trace simple exception-handling flow when an exception occurs or does not occur.',
      ],
    },
  ],
  '5': [
    {
      id: '5.1.1',
      title: 'Work with text files',
      exams: ['30-03'],
      subpoints: [
        'Open text files using appropriate modes, including `r`, `w`, and `a`.',
        'Read data from a text file.',
        'Write and append data to a text file.',
        'Use the `with` statement to manage file access safely.',
        'Recognize common errors when opening or accessing files.',
      ],
    },
    {
      id: '5.1.2',
      title: 'Work with CSV files',
      exams: ['30-03'],
      subpoints: [
        'Explain the basic structure of a CSV file.',
        'Import and use the `csv` module.',
        'Read CSV data using `csv.reader()`.',
        'Write CSV data using `csv.writer()`.',
        'Process rows and values read from a CSV file.',
      ],
    },
    {
      id: '5.2.1',
      title: 'Import and use modules',
      exams: ['30-03'],
      subpoints: [
        'Explain the purpose and benefits of importing existing code.',
        'Use the `import` keyword to load a module.',
        'Access objects provided by an imported module.',
      ],
    },
    {
      id: '5.2.2',
      title: 'Perform mathematical evaluations using the `math` module',
      exams: ['30-03'],
      subpoints: [
        'Import and use the `math` module.',
        'Round values upward using `ceil()`.',
        'Round values downward using `floor()`.',
        'Remove the fractional part of a value using `trunc()`.',
        'Calculate square roots using `sqrt()`.',
      ],
    },
    {
      id: '5.2.3',
      title: 'Generate and select pseudorandom values using the `random` module',
      exams: ['30-03'],
      subpoints: [
        'Import and use the `random` module.',
        'Generate pseudorandom floating-point values using `random()`.',
        'Initialize the pseudorandom number generator using `seed()`.',
        'Explain how setting a seed can produce repeatable results.',
        'Select a random element from a sequence using `choice()`.',
        'Select multiple unique elements using `sample()`.',
      ],
    },
  ],
  // Extras: topics in PCEP-30-02 but not in PCEP-30-03. Written for this app
  // (not verbatim); `source` names the 30-02 objectives they come from.
  x: [
    {
      id: 'x.1',
      title: 'Use different numeral systems and scientific notation',
      exams: ['30-02'],
      source: 'PCEP-30-02 1.3',
      subpoints: [
        'Write integer literals in binary, octal, and hexadecimal using the `0b`, `0o`, and `0x` prefixes.',
        'Convert integers to binary, octal, and hexadecimal strings using `bin()`, `oct()`, and `hex()`.',
        'Write floating-point literals in scientific notation, such as `1e3` and `2.5E-4`.',
        'Use underscores to group digits in numeric literals.',
      ],
    },
    {
      id: 'x.2',
      title: 'Use bitwise operators',
      exams: ['30-02'],
      source: 'PCEP-30-02 1.4',
      subpoints: [
        'Use the bitwise operators `~`, `&`, `^`, and `|` on integers.',
        'Use the shift operators `<<` and `>>`.',
        'Apply the precedence of bitwise operators relative to other operators.',
        'Distinguish bitwise operators from the Boolean operators `not`, `and`, and `or`.',
      ],
    },
    {
      id: 'x.3',
      title: 'Expand loops with `while-else` and `for-else`',
      exams: ['30-02'],
      source: 'PCEP-30-02 2.2',
      subpoints: [
        'Use an `else` block after a `while` loop.',
        'Use an `else` block after a `for` loop.',
        'Explain that the `else` block runs when the loop ends without `break`.',
        'Trace loops with an `else` block that contain `break`.',
      ],
    },
    {
      id: 'x.4',
      title: 'Build lists using list comprehensions',
      exams: ['30-02'],
      source: 'PCEP-30-02 3.1',
      subpoints: [
        'Build a list from an iterable using a list comprehension.',
        'Filter elements with an `if` condition inside a list comprehension.',
        'Build nested lists such as matrices with list comprehensions.',
        'Trace the list produced by a list comprehension.',
      ],
    },
    {
      id: 'x.5',
      title: 'Write recursive functions and basic generators',
      exams: ['30-02'],
      source: 'PCEP-30-02 4.1',
      subpoints: [
        'Define a recursive function with a base case.',
        'Trace the calls and results of a recursive function.',
        'Recognize infinite recursion and `RecursionError`.',
        'Define a generator function using `yield`.',
        'Iterate over the values produced by a generator.',
      ],
    },
    {
      id: 'x.6',
      title: 'Use the built-in exception hierarchy',
      exams: ['30-02'],
      source: 'PCEP-30-02 4.3, 4.4',
      subpoints: [
        'Recognize the hierarchy of `BaseException`, `Exception`, `SystemExit`, and `KeyboardInterrupt`.',
        'Recognize abstract exceptions such as `ArithmeticError` and `LookupError` and the concrete exceptions under them.',
        'Order `except` branches from the most specific to the most general.',
        'Trace how an exception propagates through function calls.',
        'Delegate responsibility for handling an exception to the caller.',
      ],
    },
  ],
}

export const GROUPS: Record<string, string> = {
  '1.1': 'Programming Language Fundamentals',
  '1.2': 'Python Program Logic and Structure',
  '1.3': 'Literals and Variables',
  '1.4': 'Operators, Expressions, and Console Operations',
  '2.1': 'Conditional Execution',
  '2.2': 'Iterative Execution',
  '3.1': 'Lists',
  '3.2': 'Tuples',
  '3.3': 'Sets',
  '3.4': 'Dictionaries',
  '3.5': 'Strings',
  '4.1': 'Functions',
  '4.2': 'Exceptions',
  '5.1': 'File Handling',
  '5.2': 'Modules and Imports',
  x: 'PCEP-30-02 extras',
}

export const OBJECTIVES: Objective[] = Object.entries(RAW).flatMap(([sectionId, list]) =>
  list.map((o) => ({
    id: o.id,
    sectionId,
    groupId: sectionId === 'x' ? 'x' : o.id.split('.').slice(0, 2).join('.'),
    title: o.title,
    exams: o.exams,
    source: o.source,
    subpoints: o.subpoints.map((s, i) => {
      const [text, exams] = typeof s === 'string' ? [s, undefined] : s
      return { id: `${o.id}.${i + 1}`, text, ...(exams && { exams }) }
    }),
  })),
)

export const OBJECTIVE_BY_ID: ReadonlyMap<string, Objective> = new Map(OBJECTIVES.map((o) => [o.id, o]))

export const SUBPOINT_BY_ID: ReadonlyMap<string, Subpoint> = new Map(
  OBJECTIVES.flatMap((o) => o.subpoints.map((s) => [s.id, s] as const)),
)

export const CORE_OBJECTIVES = OBJECTIVES.filter((o) => o.sectionId !== 'x')
export const EXTRA_OBJECTIVES = OBJECTIVES.filter((o) => o.sectionId === 'x')

const examsOf = (o: { exams?: ExamId[] }): readonly ExamId[] => o.exams ?? EXAM_IDS

export const objectiveInExam = (o: Objective, exam: ExamId) => examsOf(o).includes(exam)

/** A sub-point belongs to an exam when both it and its objective do. */
export const subpointInExam = (subpointId: string, exam: ExamId) => {
  const objective = OBJECTIVE_BY_ID.get(subpointId.split('.').slice(0, -1).join('.'))
  const subpoint = SUBPOINT_BY_ID.get(subpointId)
  return !!objective && !!subpoint && objectiveInExam(objective, exam) && examsOf(subpoint).includes(exam)
}

const ids = (sectionId: string) => OBJECTIVES.filter((o) => o.sectionId === sectionId).map((o) => o.id)

// 30-02 blocks: the matching 30-03 objectives that 30-02 also covers, plus the extras.
const block = (n: string, extras: string[]) =>
  [...ids(n).filter((id) => objectiveInExam(OBJECTIVE_BY_ID.get(id)!, '30-02')), ...extras]

export const EXAM_PROFILES: Record<ExamId, ExamProfile> = {
  '30-03': {
    id: '30-03',
    name: 'PCEP-30-03',
    syllabusUrl: 'https://pythoninstitute.org/pcep-exam-syllabus',
    items: 35,
    minutes: 50,
    passPercent: 70,
    sections: [
      { id: '1', title: 'Computer Programming and Python Fundamentals', weight: 17, items: 6, objectiveIds: ids('1') },
      { id: '2', title: 'Control Flow: Conditional Blocks and Loops', weight: 23, items: 8, objectiveIds: ids('2') },
      { id: '3', title: 'Data Collections: Lists, Tuples, Sets, Dictionaries, and Strings', weight: 26, items: 9, objectiveIds: ids('3') },
      { id: '4', title: 'Functions and Exceptions', weight: 20, items: 7, objectiveIds: ids('4') },
      { id: '5', title: 'File Handling and Module Imports', weight: 14, items: 5, objectiveIds: ids('5') },
    ],
  },
  '30-02': {
    id: '30-02',
    name: 'PCEP-30-02',
    syllabusUrl: 'https://pythoninstitute.org/pcep-30-02-exam-syllabus',
    items: 30,
    // Not stated on the 30-02 syllabus page; confirmed separately (2026-11-20).
    minutes: 40,
    passPercent: 70,
    sections: [
      { id: '1', title: 'Computer Programming and Python Fundamentals', weight: 18, items: 7, objectiveIds: block('1', ['x.1', 'x.2']) },
      { id: '2', title: 'Control Flow – Conditional Blocks and Loops', weight: 29, items: 8, objectiveIds: block('2', ['x.3']) },
      { id: '3', title: 'Data Collections – Tuples, Dictionaries, Lists, and Strings', weight: 25, items: 7, objectiveIds: block('3', ['x.4']) },
      { id: '4', title: 'Functions and Exceptions', weight: 28, items: 8, objectiveIds: block('4', ['x.5', 'x.6']) },
    ],
  },
}

/** Retirement date of PCEP-30-02 (last day it can be taken). */
export const PCEP_30_02_SUNSET = '2027-11-30'

/**
 * Mock-exam length for the 30-03 track. With the extras toggle on, one item per
 * extra objective is added and the time scales at the real exam's pace.
 */
export function mockShape(exam: ExamId, includeExtras: boolean) {
  const profile = EXAM_PROFILES[exam]
  if (exam === '30-02' || !includeExtras) return { items: profile.items, minutes: profile.minutes }
  const items = profile.items + EXTRA_OBJECTIVES.length
  return { items, minutes: Math.round((profile.minutes * items) / profile.items) }
}
