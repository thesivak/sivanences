import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageHeader } from './page-header'

// Mock the MonthSelector component
vi.mock('./month-selector', () => ({
  MonthSelector: ({
    year,
    month,
    onChange,
  }: {
    year: number
    month: number
    onChange: (year: number, month: number) => void
  }) => (
    <div data-testid="month-selector">
      <span data-testid="current-period">
        {month}/{year}
      </span>
      <button onClick={() => onChange(2024, 6)} data-testid="change-period">
        Change Period
      </button>
    </div>
  ),
}))

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Přehled" />)

    expect(screen.getByText('Přehled')).toBeInTheDocument()
  })

  it('renders title as h1 element', () => {
    render(<PageHeader title="Test Title" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Test Title'
    )
  })

  it('shows formatted month when period is provided', () => {
    render(
      <PageHeader
        title="Výdaje"
        period={{ year: 2025, month: 1 }}
        onPeriodChange={vi.fn()}
      />
    )

    // Should show Czech month name in the subtitle
    expect(screen.getByText(/leden 2025/i)).toBeInTheDocument()
  })

  it('renders MonthSelector when showMonthSelector is true and period provided', () => {
    render(
      <PageHeader
        title="Test"
        period={{ year: 2025, month: 1 }}
        onPeriodChange={vi.fn()}
        showMonthSelector={true}
      />
    )

    expect(screen.getByTestId('month-selector')).toBeInTheDocument()
  })

  it('does not render MonthSelector when showMonthSelector is false', () => {
    render(
      <PageHeader
        title="Test"
        period={{ year: 2025, month: 1 }}
        onPeriodChange={vi.fn()}
        showMonthSelector={false}
      />
    )

    expect(screen.queryByTestId('month-selector')).not.toBeInTheDocument()
  })

  it('does not render MonthSelector when period is not provided', () => {
    render(<PageHeader title="Test" showMonthSelector={true} />)

    expect(screen.queryByTestId('month-selector')).not.toBeInTheDocument()
  })

  it('does not render MonthSelector when onPeriodChange is not provided', () => {
    render(
      <PageHeader title="Test" period={{ year: 2025, month: 1 }} showMonthSelector={true} />
    )

    expect(screen.queryByTestId('month-selector')).not.toBeInTheDocument()
  })

  it('calls onPeriodChange when period is changed', async () => {
    const user = userEvent.setup()
    const onPeriodChange = vi.fn()

    render(
      <PageHeader
        title="Test"
        period={{ year: 2025, month: 1 }}
        onPeriodChange={onPeriodChange}
      />
    )

    await user.click(screen.getByTestId('change-period'))

    expect(onPeriodChange).toHaveBeenCalledWith(2024, 6)
  })

  it('renders children in the header', () => {
    render(
      <PageHeader title="Test">
        <button>Add New</button>
      </PageHeader>
    )

    expect(screen.getByRole('button', { name: 'Add New' })).toBeInTheDocument()
  })

  it('renders without period subtitle when period is not provided', () => {
    render(<PageHeader title="Export" />)

    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.queryByText(/leden/i)).not.toBeInTheDocument()
  })

  it('defaults showMonthSelector to true', () => {
    render(
      <PageHeader
        title="Test"
        period={{ year: 2025, month: 6 }}
        onPeriodChange={vi.fn()}
      />
    )

    expect(screen.getByTestId('month-selector')).toBeInTheDocument()
  })
})
