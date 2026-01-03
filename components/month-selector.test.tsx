import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthSelector } from './month-selector'

describe('MonthSelector', () => {
  const defaultProps = {
    year: 2025,
    month: 6,
    onChange: vi.fn(),
  }

  it('renders the component', () => {
    render(<MonthSelector {...defaultProps} />)

    // Should show the current year
    expect(screen.getByText('2025')).toBeInTheDocument()
    // Should render navigation buttons
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('renders navigation buttons', () => {
    render(<MonthSelector {...defaultProps} />)

    const buttons = screen.getAllByRole('button')
    // Should have prev, next, and two select triggers
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('calls onChange with previous month when clicking prev button', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<MonthSelector year={2025} month={6} onChange={onChange} />)

    // First button is the prev button
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0])

    expect(onChange).toHaveBeenCalledWith(2025, 5)
  })

  it('calls onChange with next month when clicking next button', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<MonthSelector year={2025} month={6} onChange={onChange} />)

    // Last button is the next button
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[buttons.length - 1])

    expect(onChange).toHaveBeenCalledWith(2025, 7)
  })

  it('wraps to previous year when going back from January', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<MonthSelector year={2025} month={1} onChange={onChange} />)

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0])

    expect(onChange).toHaveBeenCalledWith(2024, 12)
  })

  it('wraps to next year when going forward from December', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<MonthSelector year={2025} month={12} onChange={onChange} />)

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[buttons.length - 1])

    expect(onChange).toHaveBeenCalledWith(2026, 1)
  })

  it('displays January correctly', () => {
    render(<MonthSelector year={2025} month={1} onChange={vi.fn()} />)

    expect(screen.getByText(/leden/i)).toBeInTheDocument()
  })

  it('displays December correctly', () => {
    render(<MonthSelector year={2025} month={12} onChange={vi.fn()} />)

    expect(screen.getByText(/prosinec/i)).toBeInTheDocument()
  })

  it('has accessible navigation buttons', () => {
    render(<MonthSelector {...defaultProps} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeEnabled()
    expect(buttons[buttons.length - 1]).toBeEnabled()
  })
})
