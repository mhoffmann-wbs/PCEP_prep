// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

describe('app shell', () => {
  it('renders the home page with the non-affiliation notice', async () => {
    render(<RouterProvider router={createMemoryRouter(routes)} />)
    expect(await screen.findByRole('heading', { name: 'Python Certification Made Simple' })).toBeInTheDocument()
    expect(screen.getByText(/Not affiliated with or endorsed by the Python Institute/)).toBeInTheDocument()
  })
})
