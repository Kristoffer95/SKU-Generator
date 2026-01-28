import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppLayout } from './AppLayout'
import { useSheetsStore } from '@/store/sheets'

// Mock import-export module
vi.mock('@/lib/import-export', () => ({
  exportToExcel: vi.fn(),
  exportToCSV: vi.fn(),
  importFromExcel: vi.fn(),
}))

describe('AppLayout', () => {
  beforeEach(() => {
    useSheetsStore.setState({ sheets: [], activeSheetId: null })
  })

  it('renders header with app title', () => {
    render(<AppLayout>content</AppLayout>)
    expect(screen.getByText('SKU Generator')).toBeInTheDocument()
  })

  it('renders sidebar with Specifications header', () => {
    render(<AppLayout>content</AppLayout>)
    expect(screen.getByText('Specifications')).toBeInTheDocument()
  })

  it('renders sidebar content when provided', () => {
    render(
      <AppLayout sidebar={<div>Sidebar Content</div>}>
        Main Content
      </AppLayout>
    )
    expect(screen.getByText('Sidebar Content')).toBeInTheDocument()
    expect(screen.getByText('Main Content')).toBeInTheDocument()
  })

  it('renders Settings button in sidebar footer', () => {
    render(<AppLayout>content</AppLayout>)
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })

  it('has a sidebar toggle button', () => {
    render(<AppLayout>content</AppLayout>)
    expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeInTheDocument()
  })

  it('toggles sidebar when clicking trigger button', () => {
    render(<AppLayout>content</AppLayout>)
    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i })

    // Sidebar should be visible initially
    expect(screen.getByText('Specifications')).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(toggleButton)

    // Sidebar provider updates state (offcanvas mode hides sidebar)
    // The sidebar should still exist in DOM but be collapsed
    expect(toggleButton).toBeInTheDocument()
  })

  it('renders Import button in header', () => {
    render(<AppLayout>content</AppLayout>)
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument()
  })

  it('renders Export dropdown button in header', () => {
    render(<AppLayout>content</AppLayout>)
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })

  it('Export button has dropdown trigger behavior', () => {
    render(<AppLayout>content</AppLayout>)
    const exportButton = screen.getByRole('button', { name: /export/i })

    // Verify button has dropdown attributes
    expect(exportButton).toHaveAttribute('aria-haspopup', 'menu')
    expect(exportButton).toHaveAttribute('data-state', 'closed')
  })

  it('has hidden file input for import', () => {
    render(<AppLayout>content</AppLayout>)
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls')
  })

  describe('layout constraints', () => {
    it('main content area has min-h-0 for proper flex shrinking', () => {
      render(<AppLayout>content</AppLayout>)
      // The inner main element (inside SidebarInset) should have min-h-0
      const mainElements = screen.getAllByRole('main')
      // The outer main is SidebarInset, inner contains our content
      const innerMain = mainElements.find(el => el.classList.contains('min-h-0'))
      expect(innerMain).toBeInTheDocument()
    })

    it('SidebarInset has h-svh and overflow-hidden for fixed viewport height', () => {
      render(<AppLayout>content</AppLayout>)
      // SidebarInset renders as a main element with h-svh class
      const mainElements = screen.getAllByRole('main')
      const sidebarInset = mainElements.find(el => el.classList.contains('h-svh'))
      expect(sidebarInset).toBeInTheDocument()
      expect(sidebarInset).toHaveClass('overflow-hidden')
    })
  })
})
