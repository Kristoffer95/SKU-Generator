import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Fortune-Sheet to avoid canvas errors in jsdom
vi.mock('@fortune-sheet/react', () => ({
  Workbook: vi.fn(() => <div data-testid="mock-workbook">Mock Workbook</div>),
}))

// Mock guided-tour module
const mockStartGuidedTour = vi.fn()
const mockHasTourCompleted = vi.fn()

vi.mock('@/lib/guided-tour', () => ({
  startGuidedTour: () => mockStartGuidedTour(),
  hasTourCompleted: () => mockHasTourCompleted(),
  getTourState: vi.fn(() => ({
    basicCompleted: false,
    advancedCompleted: false,
    lastViewed: null,
    neverShowModal: false,
  })),
  resetTourState: vi.fn(),
  registerTourDialogOpeners: vi.fn(),
  unregisterTourDialogOpeners: vi.fn(),
}))

import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockStartGuidedTour.mockReset()
    mockHasTourCompleted.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the SKU Generator heading', () => {
    mockHasTourCompleted.mockReturnValue(true)
    render(<App />)
    expect(screen.getByText('SKU Generator')).toBeInTheDocument()
  })

  it('auto-starts tour on first page load when tour not completed', () => {
    mockHasTourCompleted.mockReturnValue(false)
    render(<App />)

    // Tour should not start immediately
    expect(mockStartGuidedTour).not.toHaveBeenCalled()

    // Advance timer past the 750ms delay
    vi.advanceTimersByTime(750)

    expect(mockStartGuidedTour).toHaveBeenCalledTimes(1)
  })

  it('does not auto-start tour when tour already completed', async () => {
    mockHasTourCompleted.mockReturnValue(true)
    render(<App />)

    // Advance timer past the delay
    vi.advanceTimersByTime(1000)

    // Tour should not have been started
    expect(mockStartGuidedTour).not.toHaveBeenCalled()
  })
})
