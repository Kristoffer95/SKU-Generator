import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Fortune-Sheet to avoid canvas errors in jsdom
vi.mock('@fortune-sheet/react', () => ({
  Workbook: vi.fn(() => <div data-testid="mock-workbook">Mock Workbook</div>),
}))

import App from './App'

describe('App', () => {
  it('renders the SKU Generator heading', () => {
    render(<App />)
    expect(screen.getByText('SKU Generator')).toBeInTheDocument()
  })
})
