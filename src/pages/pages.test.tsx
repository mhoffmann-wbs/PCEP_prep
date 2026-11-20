// @vitest-environment jsdom
import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../app/routes'
import { ITEMS } from '../content/bank'
import type { Item } from '../content/schema'
import { getProgress, resetProgress } from '../progress/store'

/** Renders the app at `path` and waits for the lazy-loaded page to replace the fallback. */
async function renderAt(path: string) {
  const result = render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
  if (screen.queryByText('Loading…')) await waitForElementToBeRemoved(() => screen.queryByText('Loading…'), { timeout: 5000 })
  return result
}

/** The item whose stem is on screen (sessions are shuffled). */
const shownItem = (pool: Item[]) =>
  pool.find((i) => screen.queryAllByText((_, el) => el?.tagName === 'P' && el.textContent === i.stem.replaceAll('`', '')).length > 0)!

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
})

describe('practice', () => {
  it('gives feedback, records the attempt, and unlocks Run only after Check', async () => {
    const user = userEvent.setup()
    // Every 4.1.2 item has code, so Run must appear after Check.
    await renderAt('/practice?objective=4.1.2')
    const item = shownItem(ITEMS.filter((i) => i.objectiveId === '4.1.2'))
    expect(item).toBeDefined()
    expect(screen.queryByRole('button', { name: /Run/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open in Playground' })).not.toBeInTheDocument()

    const options = item.kind === 'multi' ? screen.getAllByRole('checkbox') : screen.getAllByRole('radio')
    const count = item.kind === 'multi' ? item.select : 1
    for (const option of options.slice(0, count)) await user.click(option)
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
      const check = screen.getByRole('button', { name: 'Check answer' })
      if ((check as HTMLButtonElement).disabled) {
        const radios = screen.queryAllByRole('radio')
        const boxes = screen.queryAllByRole('checkbox')
        if (radios.length) await user.click(radios[0]!)
        else if (boxes.length) for (const b of boxes.slice(0, 3)) await user.click(b)
        for (const input of screen.queryAllByRole('textbox')) await user.type(input, 'x')
        for (const select of screen.queryAllByRole('combobox')) await user.selectOptions(select, within(select).getAllByRole('option')[1]!)
      }
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
      const rows = screen.getAllByRole('listitem')
      const from = rows.findIndex((r) => r.textContent?.includes(order.lines[target]!))
      for (let pos = from; pos > target; pos--) await user.click(screen.getByRole('button', { name: `Move line ${pos + 1} up` }))
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

    const total = new Set(ITEMS.map((i) => i.objectiveId)).size
    await user.click(screen.getByRole('button', { name: 'Flag for review' }))
    for (let n = 0; n < total; n++) {
      expect(screen.queryByRole('button', { name: /Run/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Open in Playground' })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: n + 1 === total ? 'Review' : 'Next' }))
    }
    expect(screen.getByText(/1 flagged/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Submit exam' }))

    expect(screen.getByRole('heading', { name: /Pass|Not yet/ })).toBeInTheDocument()
    expect(screen.getByText(/This is an estimate/)).toBeInTheDocument()
    expect(getProgress().mockResults).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Review answers' }))
    expect(screen.queryByRole('button', { name: /Run/ })).not.toBeInTheDocument()
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

  it('shows an objective with its syllabus sub-points', async () => {
    await renderAt('/learn/2.2.1')
    expect(screen.getByText(/walrus operator/)).toBeInTheDocument()
    expect(screen.getByText('(PCEP-30-03 only)')).toBeInTheDocument()
  })

  it('shows readiness and the data export', async () => {
    await renderAt('/progress')
    expect(screen.getByText('Weighted readiness')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export progress' })).toBeInTheDocument()
  })
})
