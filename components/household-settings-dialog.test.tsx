import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HouseholdSettingsDialog } from './household-settings-dialog'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('HouseholdSettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog when open', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'default',
        totalMembers: 4,
        dependentChildren: 2,
        adults: 2,
      }),
    })

    render(
      <HouseholdSettingsDialog
        open={true}
        onOpenChange={() => {}}
      />
    )

    expect(screen.getByText('Nastavení domácnosti')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <HouseholdSettingsDialog
        open={false}
        onOpenChange={() => {}}
      />
    )

    expect(screen.queryByText('Nastavení domácnosti')).not.toBeInTheDocument()
  })

  it('fetches settings when opened', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'default',
        totalMembers: 4,
        dependentChildren: 2,
        adults: 2,
      }),
    })

    render(
      <HouseholdSettingsDialog
        open={true}
        onOpenChange={() => {}}
      />
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/household')
    })
  })

  it('displays fetched settings in form', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'default',
        totalMembers: 4,
        dependentChildren: 2,
        adults: 2,
      }),
    })

    render(
      <HouseholdSettingsDialog
        open={true}
        onOpenChange={() => {}}
      />
    )

    await waitFor(() => {
      const totalMembersInput = screen.getByLabelText('Celkem členů')
      expect(totalMembersInput).toHaveValue(4)
    })
  })

  it('updates total members when input changes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'default',
        totalMembers: 1,
        dependentChildren: 0,
        adults: 1,
      }),
    })

    render(
      <HouseholdSettingsDialog
        open={true}
        onOpenChange={() => {}}
      />
    )

    await waitFor(() => {
      const totalMembersInput = screen.getByLabelText('Celkem členů')
      expect(totalMembersInput).toHaveValue(1)
    })

    const totalMembersInput = screen.getByLabelText('Celkem členů')
    fireEvent.change(totalMembersInput, { target: { value: '3' } })

    expect(totalMembersInput).toHaveValue(3)
  })

  it('saves settings when save button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'default',
          totalMembers: 2,
          dependentChildren: 0,
          adults: 2,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'default',
          totalMembers: 2,
          dependentChildren: 0,
          adults: 2,
        }),
      })

    const mockOnOpenChange = vi.fn()
    const mockOnSave = vi.fn()

    render(
      <HouseholdSettingsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Celkem členů')).toHaveValue(2)
    })

    const saveButton = screen.getByText('Uložit')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/settings/household',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  it('auto-adjusts children when adults change', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'default',
        totalMembers: 3,
        dependentChildren: 1,
        adults: 2,
      }),
    })

    render(
      <HouseholdSettingsDialog
        open={true}
        onOpenChange={() => {}}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Celkem členů')).toHaveValue(3)
    })

    // Change adults - children should auto-adjust to maintain total
    const adultsInput = screen.getByLabelText('Dospělí')
    fireEvent.change(adultsInput, { target: { value: '1' } })

    // Children should now be 2 (3 - 1)
    await waitFor(() => {
      expect(screen.getByLabelText('Závislé děti')).toHaveValue(2)
    })
  })

  it('closes dialog when cancel is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'default',
        totalMembers: 1,
        dependentChildren: 0,
        adults: 1,
      }),
    })

    const mockOnOpenChange = vi.fn()

    render(
      <HouseholdSettingsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Celkem členů')).toHaveValue(1)
    })

    const cancelButton = screen.getByText('Zrušit')
    fireEvent.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows loading state while fetching', () => {
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    )

    render(
      <HouseholdSettingsDialog
        open={true}
        onOpenChange={() => {}}
      />
    )

    expect(screen.getByText('Načítání...')).toBeInTheDocument()
  })
})
