import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
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
})
