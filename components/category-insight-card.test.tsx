import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryInsightCard } from './category-insight-card'

describe('CategoryInsightCard', () => {
  const mockInsight = {
    insight: 'Vaše výdaje za potraviny jsou o 12% vyšší než průměr.',
    trend: 'up' as const,
    benchmarkComparison: 'Průměr české domácnosti je 3500 Kč na osobu.',
  }

  it('renders category name correctly', () => {
    render(
      <CategoryInsightCard
        categoryName="Potraviny"
        insight={mockInsight}
        onFeedback={() => {}}
      />
    )

    expect(screen.getByText('Potraviny')).toBeInTheDocument()
  })

  it('shows trend label when not expanded', () => {
    render(
      <CategoryInsightCard
        categoryName="Potraviny"
        insight={mockInsight}
        onFeedback={() => {}}
      />
    )

    expect(screen.getByText('Nárůst')).toBeInTheDocument()
  })

  it('shows downward trend correctly', () => {
    const downTrendInsight = { ...mockInsight, trend: 'down' as const }
    render(
      <CategoryInsightCard
        categoryName="Energie"
        insight={downTrendInsight}
        onFeedback={() => {}}
      />
    )

    expect(screen.getByText('Pokles')).toBeInTheDocument()
  })

  it('shows stable trend correctly', () => {
    const stableTrendInsight = { ...mockInsight, trend: 'stable' as const }
    render(
      <CategoryInsightCard
        categoryName="Bydlení"
        insight={stableTrendInsight}
        onFeedback={() => {}}
      />
    )

    expect(screen.getByText('Stabilní')).toBeInTheDocument()
  })

  it('expands on click to show full insight', () => {
    render(
      <CategoryInsightCard
        categoryName="Potraviny"
        insight={mockInsight}
        onFeedback={() => {}}
      />
    )

    // Initially insight text should not be visible
    expect(screen.queryByText(mockInsight.insight)).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(screen.getByText('Potraviny').closest('div')!.parentElement!)

    // Now insight should be visible
    expect(screen.getByText(mockInsight.insight)).toBeInTheDocument()
  })

  it('shows benchmark comparison when expanded', () => {
    render(
      <CategoryInsightCard
        categoryName="Potraviny"
        insight={mockInsight}
        onFeedback={() => {}}
      />
    )

    // Click to expand
    fireEvent.click(screen.getByText('Potraviny').closest('div')!.parentElement!)

    expect(screen.getByText(mockInsight.benchmarkComparison!)).toBeInTheDocument()
  })

  it('calls onFeedback with true when thumbs up is clicked', () => {
    const mockOnFeedback = vi.fn()
    render(
      <CategoryInsightCard
        categoryName="Potraviny"
        insight={mockInsight}
        onFeedback={mockOnFeedback}
      />
    )

    // Expand first
    fireEvent.click(screen.getByText('Potraviny').closest('div')!.parentElement!)

    // Find and click thumbs up button
    const thumbsUpButton = screen.getAllByRole('button')[0]
    fireEvent.click(thumbsUpButton)

    expect(mockOnFeedback).toHaveBeenCalledWith(true)
  })

  it('calls onFeedback with false when thumbs down is clicked', () => {
    const mockOnFeedback = vi.fn()
    render(
      <CategoryInsightCard
        categoryName="Potraviny"
        insight={mockInsight}
        onFeedback={mockOnFeedback}
      />
    )

    // Expand first
    fireEvent.click(screen.getByText('Potraviny').closest('div')!.parentElement!)

    // Find and click thumbs down button
    const thumbsDownButton = screen.getAllByRole('button')[1]
    fireEvent.click(thumbsDownButton)

    expect(mockOnFeedback).toHaveBeenCalledWith(false)
  })

  it('disables feedback buttons after feedback is given', () => {
    render(
      <CategoryInsightCard
        categoryName="Potraviny"
        insight={mockInsight}
        onFeedback={() => {}}
      />
    )

    // Expand first
    fireEvent.click(screen.getByText('Potraviny').closest('div')!.parentElement!)

    // Click thumbs up
    const thumbsUpButton = screen.getAllByRole('button')[0]
    fireEvent.click(thumbsUpButton)

    // Both buttons should now be disabled
    expect(thumbsUpButton).toBeDisabled()
    expect(screen.getAllByRole('button')[1]).toBeDisabled()
  })

  it('handles insight without benchmark comparison', () => {
    const insightWithoutBenchmark = {
      insight: 'Vaše výdaje jsou stabilní.',
      trend: 'stable' as const,
    }

    render(
      <CategoryInsightCard
        categoryName="Ostatní"
        insight={insightWithoutBenchmark}
        onFeedback={() => {}}
      />
    )

    // Expand
    fireEvent.click(screen.getByText('Ostatní').closest('div')!.parentElement!)

    // Should show insight but not benchmark
    expect(screen.getByText(insightWithoutBenchmark.insight)).toBeInTheDocument()
  })
})
