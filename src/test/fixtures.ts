// One valid item of each kind, used by schema and quality tests.
import type { Item } from '../content/schema'

type Of<K extends Item['kind']> = Extract<Item, { kind: K }>

const opt = (text: string, correct = false) => ({ text, correct, rationale: `Because of ${text}.` })

export const SINGLE: Of<'single'> = {
  id: '2.2.3-01',
  kind: 'single',
  objectiveId: '2.2.3',
  subpoints: ['2.2.3.2'],
  stem: 'What is the output of the following code?',
  code: 'for i in range(1, 7, 2):\n    print(i, end=" ")',
  output: '1 3 5 ',
  outputKey: true,
  options: [opt('1 3 5', true), opt('1 3 5 7'), opt('2 4 6'), opt('1 2 3 4 5 6')],
  explanation: 'range(1, 7, 2) starts at 1 and steps by 2, stopping before 7.',
}

export const MULTI: Of<'multi'> = {
  id: '1.3.2-01',
  kind: 'multi',
  objectiveId: '1.3.2',
  subpoints: ['1.3.2.4'],
  stem: 'Which of these are valid Python identifiers? (Select TWO)',
  select: 2,
  options: [opt('shopping_list', true), opt('_total', true), opt('2nd_place'), opt('for'), opt('my-pet')],
  explanation: 'Identifiers start with a letter or underscore and cannot be keywords.',
}

export const GAP: Of<'gap'> = {
  id: '3.4.1-01',
  kind: 'gap',
  objectiveId: '3.4.1',
  subpoints: ['3.4.1.5'],
  stem: 'Fill in the blanks so the program prints each pet and its age.',
  code: 'ages = {"Rex": 3, "Tom": 5}\nfor name, age in ages.__BLANK1__():\n    print(name, age)',
  output: 'Rex 3\nTom 5\n',
  blanks: [{ n: 1, kind: 'choice', choices: ['keys', 'values', 'items'], answer: 'items', rationale: 'items() yields pairs.' }],
  explanation: 'items() gives key-value pairs that unpack into name and age.',
}

export const ORDER: Of<'order'> = {
  id: '1.4.1-01',
  kind: 'order',
  objectiveId: '1.4.1',
  subpoints: ['1.4.1.1'],
  stem: 'Put the lines in order so the program prints the total price.',
  mode: 'code',
  lines: ['price = 4', 'qty = 3', 'total = price * qty', 'print(total)'],
  altOrders: [[1, 0, 2, 3]],
  output: '12\n',
  rationale: 'Both variables must exist before total is computed, and total before it is printed.',
  explanation: 'A name must be assigned before a later line uses it; price and qty can come in either order.',
}

export const INSERT: Of<'insert'> = {
  id: '4.1.2-01',
  kind: 'insert',
  objectiveId: '4.1.2',
  subpoints: ['4.1.2.1'],
  stem: 'Which line makes the program print 12?',
  code: 'def area(w, h):\n    # >>> INSERT <<<\n\nprint(area(3, 4))',
  output: '12\n',
  options: [opt('return w * h', true), opt('print(w * h)'), opt('w * h'), opt('return w + h')],
  explanation: 'The function must return the product so print() can display it.',
}

export const ALL_KINDS = [SINGLE, MULTI, GAP, ORDER, INSERT]
