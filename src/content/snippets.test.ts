import { describe, expect, it } from 'vitest'
import { extractSnippets } from './snippets'

const fence = (lang: string, body: string) => ['```' + lang, body, '```'].join('\n')

describe('extractSnippets', () => {
  it('pairs a python block with the input and output blocks right after it', () => {
    const src = [fence('python', 'x = input()\nprint(x)'), '', fence('input', 'Ann'), '', fence('output', 'Ann')].join('\n')
    expect(extractSnippets(src)).toEqual([{ line: 1, code: 'x = input()\nprint(x)', stdin: 'Ann', output: 'Ann' }])
  })

  it('reads error claims and leaves blocks separated by prose unpaired', () => {
    const src = [fence('python', '1/0'), fence('error', 'ZeroDivisionError: division by zero'), 'Some prose.', fence('output', 'x')].join('\n')
    expect(extractSnippets(src)).toEqual([{ line: 1, code: '1/0', error: 'ZeroDivisionError: division by zero' }])
    const unpaired = [fence('python', 'print(1)'), 'Then:', fence('output', '1')].join('\n')
    expect(extractSnippets(unpaired)[0]?.output).toBeUndefined()
  })
})
