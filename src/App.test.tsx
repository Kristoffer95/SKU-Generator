import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'

// Mock Fortune-Sheet to avoid canvas errors in jsdom
vi.mock('@fortune-sheet/react', () => ({
  Workbook: vi.fn(() => <div data-testid="mock-workbook">Mock Workbook</div>),
}))

// Mock guided-tour module
const mockStartGuidedTour = vi.fn()
const mockGetTourState = vi.fn()

vi.mock('@/lib/guided-tour', () => ({
  startGuidedTour: (type: string) => mockStartGuidedTour(type),
  hasTourCompleted: vi.fn(() => false),
  getTourState: () => mockGetTourState(),
  updateTourState: vi.fn(),
  resetTourState: vi.fn(),
  registerTourDialogOpeners: vi.fn(),
  unregisterTourDialogOpeners: vi.fn(),
}))

import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockStartGuidedTour.mockReset()
    mockGetTourState.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the SKU Generator heading', () => {
    mockGetTourState.mockReturnValue({
      basicCompleted: true,
      advancedCompleted: false,
      lastViewed: 'basic',
      neverShowModal: false,
    })
    render(<App />)
    expect(screen.getByText('SKU Generator')).toBeInTheDocument()
  })

  it('shows TourSelectionModal on first page load when no tours completed', async () => {
    mockGetTourState.mockReturnValue({
      basicCompleted: false,
      advancedCompleted: false,
      lastViewed: null,
      neverShowModal: false,
    })
    render(<App />)

    // Modal should not show immediately
    expect(screen.queryByTestId('tour-selection-modal')).not.toBeInTheDocument()

    // Advance timer past the 750ms delay
    await act(async () => {
      vi.advanceTimersByTime(750)
    })

    // Modal should now be visible
    expect(screen.getByTestId('tour-selection-modal')).toBeInTheDocument()
    expect(screen.getByText('Welcome to SKU Generator!')).toBeInTheDocument()
  })

  it('does not show TourSelectionModal when basic tour already completed', async () => {
    mockGetTourState.mockReturnValue({
      basicCompleted: true,
      advancedCompleted: false,
      lastViewed: 'basic',
      neverShowModal: false,
    })
    render(<App />)

    // Advance timer past the delay
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Modal should not be shown
    expect(screen.queryByTestId('tour-selection-modal')).not.toBeInTheDocument()
  })

  it('does not show TourSelectionModal when advanced tour already completed', async () => {
    mockGetTourState.mockReturnValue({
      basicCompleted: false,
      advancedCompleted: true,
      lastViewed: 'advanced',
      neverShowModal: false,
    })
    render(<App />)

    // Advance timer past the delay
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Modal should not be shown
    expect(screen.queryByTestId('tour-selection-modal')).not.toBeInTheDocument()
  })

  it('does not show TourSelectionModal when neverShowModal is true', async () => {
    mockGetTourState.mockReturnValue({
      basicCompleted: false,
      advancedCompleted: false,
      lastViewed: null,
      neverShowModal: true,
    })
    render(<App />)

    // Advance timer past the delay
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Modal should not be shown
    expect(screen.queryByTestId('tour-selection-modal')).not.toBeInTheDocument()
  })

  it('starts basic tour when user clicks Start Basic Tour', async () => {
    mockGetTourState.mockReturnValue({
      basicCompleted: false,
      advancedCompleted: false,
      lastViewed: null,
      neverShowModal: false,
    })
    render(<App />)

    // Advance timer to show modal
    await act(async () => {
      vi.advanceTimersByTime(750)
    })

    // Click Start Basic Tour
    const basicTourButton = screen.getByTestId('start-basic-tour')
    await act(async () => {
      fireEvent.click(basicTourButton)
    })

    // Modal should close
    expect(screen.queryByTestId('tour-selection-modal')).not.toBeInTheDocument()

    // Advance timer to allow tour to start (100ms delay)
    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    // Tour should have been started with 'basic' type
    expect(mockStartGuidedTour).toHaveBeenCalledWith('basic')
  })

  it('starts advanced tour when user clicks Start Advanced Tour', async () => {
    mockGetTourState.mockReturnValue({
      basicCompleted: false,
      advancedCompleted: false,
      lastViewed: null,
      neverShowModal: false,
    })
    render(<App />)

    // Advance timer to show modal
    await act(async () => {
      vi.advanceTimersByTime(750)
    })

    // Click Start Advanced Tour
    const advancedTourButton = screen.getByTestId('start-advanced-tour')
    await act(async () => {
      fireEvent.click(advancedTourButton)
    })

    // Modal should close
    expect(screen.queryByTestId('tour-selection-modal')).not.toBeInTheDocument()

    // Advance timer to allow tour to start (100ms delay)
    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    // Tour should have been started with 'advanced' type
    expect(mockStartGuidedTour).toHaveBeenCalledWith('advanced')
  })

  it('closes modal without starting tour when user clicks Skip for now', async () => {
    mockGetTourState.mockReturnValue({
      basicCompleted: false,
      advancedCompleted: false,
      lastViewed: null,
      neverShowModal: false,
    })
    render(<App />)

    // Advance timer to show modal
    await act(async () => {
      vi.advanceTimersByTime(750)
    })

    // Click Skip for now
    const skipLink = screen.getByTestId('skip-tour-link')
    await act(async () => {
      fireEvent.click(skipLink)
    })

    // Modal should close
    expect(screen.queryByTestId('tour-selection-modal')).not.toBeInTheDocument()

    // Advance timer past any potential delays
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Tour should NOT have been started
    expect(mockStartGuidedTour).not.toHaveBeenCalled()
  })
})
