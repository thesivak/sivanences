import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './stat-card'

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Celkové příjmy" value={50000} />)

    expect(screen.getByText('Celkové příjmy')).toBeInTheDocument()
    expect(screen.getByText(/50.*000/)).toBeInTheDocument()
  })

  it('formats value as currency by default', () => {
    render(<StatCard label="Test" value={1234} />)

    // Should contain "Kc" for Czech currency
    expect(screen.getByText(/Kc/)).toBeInTheDocument()
  })

  it('renders without currency when showCurrency is false', () => {
    render(<StatCard label="Počet" value={42} showCurrency={false} />)

    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows percentage change when previousValue is provided', () => {
    render(<StatCard label="Test" value={110} previousValue={100} />)

    expect(screen.getByText(/10.*%/)).toBeInTheDocument()
    expect(screen.getByText(/oproti minulému měsíci/)).toBeInTheDocument()
  })

  it('shows positive trend indicator for increase', () => {
    render(<StatCard label="Test" value={150} previousValue={100} />)

    // Should show +50%
    expect(screen.getByText(/\+50/)).toBeInTheDocument()
  })

  it('does not show trend when previousValue is undefined', () => {
    render(<StatCard label="Test" value={100} />)

    expect(screen.queryByText(/oproti minulému měsíci/)).not.toBeInTheDocument()
  })

  it('does not show trend percentage when previousValue is 0', () => {
    render(<StatCard label="Test" value={100} previousValue={0} />)

    // When previousValue is 0, percentage can't be calculated
    expect(screen.queryByText(/oproti minulému měsíci/)).not.toBeInTheDocument()
  })

  it('applies correct color class for income type', () => {
    const { container } = render(
      <StatCard label="Příjmy" value={50000} type="income" />
    )

    // Income should have green text color class
    const valueElement = container.querySelector('.text-\\[\\#1B5E20\\]')
    expect(valueElement).toBeInTheDocument()
  })

  it('applies correct color class for expense type', () => {
    const { container } = render(
      <StatCard label="Výdaje" value={30000} type="expense" />
    )

    // Expense should have red text color class
    const valueElement = container.querySelector('.text-\\[\\#B71C1C\\]')
    expect(valueElement).toBeInTheDocument()
  })

  it('applies green color for positive balance', () => {
    const { container } = render(
      <StatCard label="Zůstatek" value={20000} type="balance" />
    )

    const valueElement = container.querySelector('.text-\\[\\#1B5E20\\]')
    expect(valueElement).toBeInTheDocument()
  })

  it('applies red color for negative balance', () => {
    const { container } = render(
      <StatCard label="Zůstatek" value={-5000} type="balance" />
    )

    const valueElement = container.querySelector('.text-\\[\\#B71C1C\\]')
    expect(valueElement).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <StatCard label="Test" value={100} className="custom-class" />
    )

    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('shows decrease indicator when value is lower', () => {
    render(<StatCard label="Test" value={80} previousValue={100} />)

    // Should show -20%
    expect(screen.getByText(/-20/)).toBeInTheDocument()
  })

  it('applies correct trend color for expense decrease (green)', () => {
    const { container } = render(
      <StatCard label="Výdaje" value={80} previousValue={100} type="expense" />
    )

    // For expenses, decrease is good (green)
    const trendElement = container.querySelector('.text-\\[\\#1B5E20\\]')
    expect(trendElement).toBeInTheDocument()
  })

  it('applies correct trend color for expense increase (red)', () => {
    const { container } = render(
      <StatCard label="Výdaje" value={120} previousValue={100} type="expense" />
    )

    // For expenses, increase is bad (red)
    const trendElement = container.querySelector('.text-\\[\\#B71C1C\\]')
    expect(trendElement).toBeInTheDocument()
  })

  it('handles zero value correctly', () => {
    render(<StatCard label="Test" value={0} />)

    expect(screen.getByText(/0.*Kc/)).toBeInTheDocument()
  })

  it('handles large values correctly', () => {
    render(<StatCard label="Test" value={1234567} />)

    // Should format with spaces as thousand separators
    expect(screen.getByText(/1.*234.*567/)).toBeInTheDocument()
  })
})
