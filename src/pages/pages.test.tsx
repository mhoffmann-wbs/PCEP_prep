// @vitest-environment jsdom
import { act, cleanup, render, screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../app/routes'
import { ITEMS } from '../content/bank'
import { LESSONS } from '../content/lessons'
import type { Item } from '../content/schema'
import { EXERCISES } from '../content/exercises'
import { getProgress, resetProgress, setTrack as storeSetTrack } from '../progress/store'
import { pythonRunner } from '../python/client'
import { encodeCode } from './playgroundLink'

const setTrack = (t: '30-03' | '30-02') => act(() => storeSetTrack(t))

/** Renders the app at `path` and waits for the lazy-loaded page to replace the fallback. */
async function renderAt(path: string) {
  const result = render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
  if (screen.queryByText('Loading…')) await waitForElementToBeRemoved(() => screen.queryByText('Loading…'), { timeout: 5000 })
  return result
}

/** The item on screen (sessions are shuffled). */
const shownItem = (pool: Item[]) => {
  const id = document.querySelector('[data-item-id]')?.getAttribute('data-item-id')
  return pool.find((i) => i.id === id)!
}

/** Gives some answer to whatever item is on screen, so "Check answer" is enabled. */
async function answerAnything(user: ReturnType<typeof userEvent.setup>) {
  const radios = screen.queryAllByRole('radio')
  const boxes = screen.queryAllByRole('checkbox')
  if (radios.length) await user.click(radios[0]!)
  else if (boxes.length) for (const b of boxes.slice(0, 3)) await user.click(b)
  for (const input of screen.queryAllByRole('textbox')) await user.type(input, 'x')
  for (const select of screen.queryAllByRole('combobox')) await user.selectOptions(select, within(select).getAllByRole('option')[1]!)
}

beforeEach(() => {
  localStorage.clear()
  resetProgress()
})

describe('shell', () => {
  it('renders the home page with the syllabus and the non-affiliation notice', async () => {
    await renderAt('/')
    expect(screen.getByRole('heading', { name: 'Python Certification Made Simple' })).toBeInTheDocument()
    expect(screen.getByText(/Not affiliated with or endorsed by the Python Institute/)).toBeInTheDocument()
    expect(screen.getByText('5. File Handling and Module Imports')).toBeInTheDocument()
  })

  it('opens the phone menu and closes it when a link is followed', async () => {
    const user = userEvent.setup()
    await renderAt('/')
    const menu = screen.getByRole('button', { name: 'Menu' })
    await user.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('link', { name: 'Exercises' }))
    expect(await screen.findByRole('heading', { name: 'Exercises' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('practice', () => {
  it('gives feedback, records the attempt, and unlocks Run only after Check', async () => {
    const user = userEvent.setup()
    // Every 4.1.2 item has code, so Run must appear after Check.
    await renderAt('/practice?objective=4.1.2')
    const item = shownItem(ITEMS.filter((i) => i.objectiveId === '4.1.2'))
    expect(item).toBeDefined()
    expect(screen.queryByRole('button', { name: /^Run/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open in Playground' })).not.toBeInTheDocument()

    await answerAnything(user)
    await user.click(screen.getByRole('button', { name: 'Check answer' }))

    expect(screen.getByText('Explanation')).toBeInTheDocument()
    expect(getProgress().items[item.id]).toMatchObject({ attempts: 1 })
    expect(screen.getByRole('button', { name: /Run (this|the completed) code/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open in Playground' })).toBeInTheDocument()
  })

  it('limits multiple-choice items to the stated number of selections', async () => {
    const user = userEvent.setup()
    const multi = ITEMS.find((i) => i.kind === 'multi')!
    await renderAt(`/questions/${multi.id}`)
    const boxes = screen.getAllByRole('checkbox')
    for (const box of boxes.slice(0, 3)) await user.click(box)
    expect(boxes.filter((b) => (b as HTMLInputElement).checked)).toHaveLength(2)
  })

  it('runs a mixed set and ends with a session review', async () => {
    const user = userEvent.setup()
    await renderAt('/practice')
    await user.click(screen.getByRole('link', { name: '10 questions' }))
    const total = Math.min(10, ITEMS.length)
    expect(screen.getByText(new RegExp(`Question 1 of ${total}`))).toBeInTheDocument()
    expect(screen.queryByLabelText('time remaining')).not.toBeInTheDocument()
    for (let n = 0; n < total; n++) {
      // Skip straight through: an ordering item is always "answered"; others get their first option or a typed gap.
      if ((screen.getByRole('button', { name: 'Check answer' }) as HTMLButtonElement).disabled) await answerAnything(user)
      await user.click(screen.getByRole('button', { name: 'Check answer' }))
      await user.click(screen.getByRole('button', { name: /Next question|Finish/ }))
    }
    expect(screen.getByRole('heading', { name: /Session complete/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Session review' })).toBeInTheDocument()
  })
})

describe('item kinds', () => {
  it('fills gaps and grades them', async () => {
    const user = userEvent.setup()
    const gap = ITEMS.find((i) => i.kind === 'gap' && i.blanks.some((b) => b.kind === 'choice'))!
    await renderAt(`/questions/${gap.id}`)
    if (gap.kind !== 'gap') throw new Error('expected a gap item')
    for (const b of gap.blanks) {
      const field = screen.getByLabelText(`Blank ${b.n}`)
      if (b.kind === 'choice') await user.selectOptions(field, b.answer)
      else await user.type(field, b.accept[0]!.replace(/[[{]/g, (c) => c + c))
    }
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('reorders lines with the arrow buttons', async () => {
    const user = userEvent.setup()
    const order = ITEMS.find((i) => i.kind === 'order')!
    await renderAt(`/questions/${order.id}`)
    if (order.kind !== 'order') throw new Error('expected an order item')
    // Bubble each line into place using only the up buttons.
    for (let target = 0; target < order.lines.length; target++) {
      const rows = within(screen.getByRole('list', { name: /in your order/ })).getAllByRole('listitem')
      const from = rows.findIndex((r) => r.textContent?.includes(order.lines[target]!))
      for (let pos = from; pos > target; pos--) {
        const up = within(within(screen.getByRole('list', { name: /in your order/ })).getAllByRole('listitem')[pos]!).getByRole('button', { name: /up$/ })
        await user.click(up)
        // Focus follows the moved line, and the move is announced.
        expect(document.activeElement?.closest('li')?.textContent).toContain(order.lines[target]!.trim())
        expect(screen.getByText(`${order.lines[target]!.trim()} moved to position ${pos} of ${order.lines.length}.`)).toBeInTheDocument()
      }
    }
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })
})

describe('mock exam', () => {
  it('never offers Run, flags items, and reports results by section', async () => {
    const user = userEvent.setup()
    await renderAt('/mock')
    await user.click(screen.getByRole('button', { name: 'Start the mock exam' }))
    expect(screen.getByLabelText('time remaining')).toBeInTheDocument()

    const total = Number(screen.getByText(/^Question 1 of \d+$/).textContent!.split(' of ')[1])
    expect(total).toBe(35)
    await user.click(screen.getByRole('button', { name: 'Flag for review' }))
    for (let n = 0; n < total; n++) {
      expect(screen.queryByRole('button', { name: /^Run/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Open in Playground' })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: n + 1 === total ? 'Review' : 'Next' }))
    }
    expect(screen.getByText(/1 flagged/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Submit exam' }))

    expect(screen.getByRole('heading', { name: /Pass|Not yet/ })).toBeInTheDocument()
    expect(screen.getByText(/This is an estimate/)).toBeInTheDocument()
    expect(getProgress().mockResults).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Review answers' }))
    expect(screen.queryByRole('button', { name: /^Run/ })).not.toBeInTheDocument()
  })
})

describe('exam track', () => {
  it('switches to PCEP-30-02 and filters practice, with the extras on by default', async () => {
    const user = userEvent.setup()
    await renderAt('/')
    await user.click(screen.getByRole('radio', { name: /^PCEP-30-02/ }))
    expect(getProgress()).toMatchObject({ track: '30-02', extrasInPractice: true, extrasInMock: true })
    expect(screen.getByText(/30 questions in 40 minutes/)).toBeInTheDocument()
    cleanup()

    await renderAt('/practice')
    expect(screen.queryByText(/File Handling and Module Imports/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/Use bitwise operators/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('checkbox', { name: /Include PCEP-30-02 topics in practice/ }))
    expect(screen.queryByText(/Use bitwise operators/)).not.toBeInTheDocument()
  })

  it('locks the mock extras on for PCEP-30-02 and lets 30-03 extend its mock', async () => {
    const user = userEvent.setup()
    await renderAt('/mock')
    const box = screen.getByRole('checkbox', { name: /Include PCEP-30-02 topics in the mock exam/ })
    expect(box).not.toBeChecked()
    await user.click(box)
    expect(getProgress().extrasInMock).toBe(true)
    setTrack('30-02')
    expect(await screen.findByText(/Always included in the PCEP-30-02 mock/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Include PCEP-30-02 topics in the mock exam/ })).toBeDisabled()
  })
})

describe('learn and progress', () => {
  it('renders a lesson: predict needs a guess before the reveal, and it can be marked as read', async () => {
    const user = userEvent.setup()
    await renderAt('/learn/3.1.1')
    expect(screen.getByRole('heading', { name: 'Big idea' })).toBeInTheDocument()
    const reveal = screen.getAllByRole('button', { name: 'Reveal the answer' })[0]!
    expect(reveal).toBeDisabled()
    await user.type(screen.getAllByLabelText('Your guess')[0]!, 'something')
    await user.click(reveal)
    expect(screen.getByText('Compare your guess with the real result:')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as read' }))
    expect(getProgress().lessonsRead).toEqual(['3.1.1'])
    expect(screen.getByRole('navigation', { name: 'Lesson navigation' })).toBeInTheDocument()
  })

  it('renders every lesson with its predict checks', async () => {
    for (const [id, lesson] of LESSONS) {
      const { unmount } = await renderAt(`/learn/${id}`)
      expect(screen.getByRole('heading', { name: 'Exam traps' }), id).toBeInTheDocument()
      expect(screen.getAllByText('What does this print?').length, `${id} predict blocks`).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('In short:').parentElement?.textContent, id).toContain(lesson.meta.tldr.replaceAll('`', ''))
      unmount()
    }
  }, 60_000)

  it('shows an objective with its syllabus sub-points', async () => {
    await renderAt('/learn/2.2.1')
    expect(screen.getAllByText(/walrus operator/).length).toBeGreaterThan(0)
    expect(screen.getByText('(PCEP-30-03 only)')).toBeInTheDocument()
  })

  it('shows readiness and the data export', async () => {
    await renderAt('/progress')
    expect(screen.getByText('Weighted readiness')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export progress' })).toBeInTheDocument()
  })
})

describe('exercises', () => {
  it('lists the exercises by section and links each from its lesson', async () => {
    await renderAt('/exercises')
    expect(screen.getByRole('heading', { name: 'Exercises' })).toBeInTheDocument()
    expect(screen.getByText(`0 of ${EXERCISES.length} solved.`, { exact: false })).toBeInTheDocument()
    cleanup()
    const ex = EXERCISES[0]!
    await renderAt(`/learn/${ex.objectiveId}`)
    expect(screen.getByRole('link', { name: ex.title })).toHaveAttribute('href', `/exercises/${ex.id}`)
  })

  it('reveals hints one at a time, checks the code and records a solve', async () => {
    const ex = EXERCISES.find((e) => e.kind === 'function')!
    // No worker in jsdom: report every check as passed.
    const run = vi.spyOn(pythonRunner, 'run').mockImplementation(async (req) => ({
      stdout: '',
      stderr: '',
      error: null,
      files: {},
      timedOut: false,
      checks: (req.checks ?? []).map((c) => ({ call: c.call, passed: true, got: null, want: null, printed: '', error: null })),
    }))
    const user = userEvent.setup()
    await renderAt(`/exercises/${ex.id}`)
    expect(screen.getByRole('heading', { name: ex.title })).toBeInTheDocument()
    expect(document.querySelector('.cm-content')?.textContent).toContain(ex.starter.split('\n')[0])
    await user.click(screen.getByRole('button', { name: `Show hint 1 of ${ex.hints.length}` }))
    expect(screen.getByText('Hint 1:')).toBeInTheDocument()
    expect(screen.queryByText('Hint 2:')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Check' }))
    expect(await screen.findByText('✓ All checks passed. Well done!')).toBeInTheDocument()
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ checks: ex.checks }))
    expect(getProgress().exercises[ex.id]).toMatchObject({ attempts: 1, solvedAt: expect.any(Number) })
    run.mockRestore()
  })
})

describe('playground', () => {
  it('opens the code from a permalink', async () => {
    await renderAt(`/playground${encodeCode('print("from a link")')}`)
    expect(document.querySelector('.cm-content')?.textContent).toBe('print("from a link")')
  })
})

describe('guides', () => {
  it('renders the cheat sheet with static code and a print button', async () => {
    await renderAt('/guides/cheat-sheet')
    expect(screen.getByRole('heading', { level: 1, name: 'Cheat sheet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Run and edit/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('Output').length).toBeGreaterThan(0)
  })

  it('fills the exam facts from the exam profiles', async () => {
    await renderAt('/guides/exam-day')
    const table = screen.getAllByRole('table')[0]!
    expect(within(table).getByText('50 minutes')).toBeInTheDocument()
    expect(within(table).getByText('35')).toBeInTheDocument()
  })
})
