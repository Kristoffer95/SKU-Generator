import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AutoPopulateDialog, generateCombinations } from './AutoPopulateDialog'
import type { ColumnDef, Specification } from '@/types'

// Mock specifications and columns for testing
const createMockSpec = (name: string, values: { displayValue: string; skuFragment: string }[]): Specification => ({
  id: `spec-${name.toLowerCase()}`,
  name,
  order: 0,
  values: values.map((v, i) => ({
    id: `value-${name.toLowerCase()}-${i}`,
    ...v,
  })),
})

const createMockColumn = (type: 'sku' | 'spec' | 'free', header: string, specId?: string): ColumnDef => ({
  id: `col-${header.toLowerCase()}`,
  type,
  header,
  specId,
})

describe('AutoPopulateDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnGenerate = vi.fn()

  const colorSpec = createMockSpec('Color', [
    { displayValue: 'Red', skuFragment: 'R' },
    { displayValue: 'Blue', skuFragment: 'B' },
  ])

  const sizeSpec = createMockSpec('Size', [
    { displayValue: 'Small', skuFragment: 'S' },
    { displayValue: 'Medium', skuFragment: 'M' },
    { displayValue: 'Large', skuFragment: 'L' },
  ])

  const allColumns: ColumnDef[] = [
    createMockColumn('sku', 'SKU'),
    createMockColumn('spec', 'Color', colorSpec.id),
    createMockColumn('spec', 'Size', sizeSpec.id),
    createMockColumn('free', 'Notes'),
  ]

  const specColumns = [
    { column: allColumns[1], specification: colorSpec, columnIndex: 1 },
    { column: allColumns[2], specification: sizeSpec, columnIndex: 2 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the dialog when open', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByTestId('auto-populate-dialog')).toBeInTheDocument()
    expect(screen.getByText('Auto Populate Combinations')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <AutoPopulateDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.queryByTestId('auto-populate-dialog')).not.toBeInTheDocument()
  })

  it('displays spec columns in a sortable list', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    const specList = screen.getByTestId('spec-order-list')
    expect(within(specList).getByText('Color')).toBeInTheDocument()
    expect(within(specList).getByText('Size')).toBeInTheDocument()
    expect(within(specList).getByText('2 values')).toBeInTheDocument()
    expect(within(specList).getByText('3 values')).toBeInTheDocument()
  })

  it('shows total combination count', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    // 2 colors * 3 sizes = 6 combinations
    const countDisplay = screen.getByTestId('combination-count')
    expect(within(countDisplay).getByText('6')).toBeInTheDocument()
  })

  it('shows no spec columns message when empty', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={[]}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByText('No specification columns found. Add spec columns first.')).toBeInTheDocument()
  })

  it('has mode toggle for replace and append', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByTestId('mode-replace')).toBeInTheDocument()
    expect(screen.getByTestId('mode-append')).toBeInTheDocument()
  })

  it('toggles between replace and append mode', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    // Default is replace mode
    const replaceBtn = screen.getByTestId('mode-replace')
    const appendBtn = screen.getByTestId('mode-append')

    expect(replaceBtn).toHaveClass('bg-primary')

    // Click append
    fireEvent.click(appendBtn)
    expect(appendBtn).toHaveClass('bg-primary')
  })

  it('calls onGenerate with correct data when Generate is clicked', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    fireEvent.click(screen.getByTestId('generate-button'))

    expect(mockOnGenerate).toHaveBeenCalledTimes(1)
    const callArg = mockOnGenerate.mock.calls[0][0]
    expect(callArg.mode).toBe('replace')
    expect(callArg.rows).toHaveLength(6) // 2 * 3 = 6 combinations
  })

  it('calls onGenerate with append mode when selected', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    // Select append mode
    fireEvent.click(screen.getByTestId('mode-append'))
    fireEvent.click(screen.getByTestId('generate-button'))

    expect(mockOnGenerate).toHaveBeenCalledTimes(1)
    const callArg = mockOnGenerate.mock.calls[0][0]
    expect(callArg.mode).toBe('append')
  })

  it('closes dialog when Cancel is clicked', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    fireEvent.click(screen.getByTestId('cancel-button'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes dialog after generation', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    fireEvent.click(screen.getByTestId('generate-button'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables Generate button when no spec columns', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={[]}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByTestId('generate-button')).toBeDisabled()
  })

  it('disables Generate button when spec has no values', () => {
    const emptySpec = createMockSpec('Empty', [])
    const emptySpecColumn = [
      { column: createMockColumn('spec', 'Empty', emptySpec.id), specification: emptySpec, columnIndex: 1 },
    ]

    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={emptySpecColumn}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByTestId('generate-button')).toBeDisabled()
  })

  it('shows combination count in Generate button', () => {
    render(
      <AutoPopulateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        specColumns={specColumns}
        allColumns={allColumns}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByTestId('generate-button')).toHaveTextContent('Generate (6)')
  })
})

describe('generateCombinations', () => {
  it('generates all combinations for single spec', () => {
    const spec = createMockSpec('Color', [
      { displayValue: 'Red', skuFragment: 'R' },
      { displayValue: 'Blue', skuFragment: 'B' },
    ])

    const columns: ColumnDef[] = [
      createMockColumn('sku', 'SKU'),
      createMockColumn('spec', 'Color', spec.id),
    ]

    const orderedSpecs = [
      {
        columnIndex: 1,
        column: columns[1],
        specification: spec,
        order: 0,
      },
    ]

    const result = generateCombinations(orderedSpecs, columns)

    expect(result).toHaveLength(2)
    expect(result[0][1]?.v).toBe('Red')
    expect(result[1][1]?.v).toBe('Blue')
  })

  it('generates all combinations for multiple specs', () => {
    const colorSpec = createMockSpec('Color', [
      { displayValue: 'Red', skuFragment: 'R' },
      { displayValue: 'Blue', skuFragment: 'B' },
    ])

    const sizeSpec = createMockSpec('Size', [
      { displayValue: 'S', skuFragment: 'S' },
      { displayValue: 'M', skuFragment: 'M' },
    ])

    const columns: ColumnDef[] = [
      createMockColumn('sku', 'SKU'),
      createMockColumn('spec', 'Color', colorSpec.id),
      createMockColumn('spec', 'Size', sizeSpec.id),
    ]

    const orderedSpecs = [
      {
        columnIndex: 1,
        column: columns[1],
        specification: colorSpec,
        order: 0,
      },
      {
        columnIndex: 2,
        column: columns[2],
        specification: sizeSpec,
        order: 1,
      },
    ]

    const result = generateCombinations(orderedSpecs, columns)

    // Color changes least (first), Size changes most (every row)
    expect(result).toHaveLength(4)
    expect(result[0][1]?.v).toBe('Red')
    expect(result[0][2]?.v).toBe('S')
    expect(result[1][1]?.v).toBe('Red')
    expect(result[1][2]?.v).toBe('M')
    expect(result[2][1]?.v).toBe('Blue')
    expect(result[2][2]?.v).toBe('S')
    expect(result[3][1]?.v).toBe('Blue')
    expect(result[3][2]?.v).toBe('M')
  })

  it('generates combinations with correct order (first changes least, last changes most)', () => {
    const spec1 = createMockSpec('Spec1', [
      { displayValue: 'A', skuFragment: 'A' },
      { displayValue: 'B', skuFragment: 'B' },
    ])

    const spec2 = createMockSpec('Spec2', [
      { displayValue: '1', skuFragment: '1' },
      { displayValue: '2', skuFragment: '2' },
      { displayValue: '3', skuFragment: '3' },
    ])

    const columns: ColumnDef[] = [
      createMockColumn('sku', 'SKU'),
      createMockColumn('spec', 'Spec1', spec1.id),
      createMockColumn('spec', 'Spec2', spec2.id),
    ]

    const orderedSpecs = [
      {
        columnIndex: 1,
        column: columns[1],
        specification: spec1,
        order: 0, // First - changes least
      },
      {
        columnIndex: 2,
        column: columns[2],
        specification: spec2,
        order: 1, // Second - changes most
      },
    ]

    const result = generateCombinations(orderedSpecs, columns)

    // Spec1 should stay constant for 3 rows (changes least)
    // Spec2 should change every row (changes most)
    expect(result).toHaveLength(6)

    // First 3 rows: Spec1 = A
    expect(result[0][1]?.v).toBe('A')
    expect(result[1][1]?.v).toBe('A')
    expect(result[2][1]?.v).toBe('A')

    // Last 3 rows: Spec1 = B
    expect(result[3][1]?.v).toBe('B')
    expect(result[4][1]?.v).toBe('B')
    expect(result[5][1]?.v).toBe('B')

    // Spec2 cycles through 1, 2, 3 for each Spec1 value
    expect(result[0][2]?.v).toBe('1')
    expect(result[1][2]?.v).toBe('2')
    expect(result[2][2]?.v).toBe('3')
    expect(result[3][2]?.v).toBe('1')
    expect(result[4][2]?.v).toBe('2')
    expect(result[5][2]?.v).toBe('3')
  })

  it('returns empty array when no specs', () => {
    const result = generateCombinations([], [])
    expect(result).toHaveLength(0)
  })

  it('returns empty array when spec has no values', () => {
    const emptySpec = createMockSpec('Empty', [])

    const columns: ColumnDef[] = [
      createMockColumn('sku', 'SKU'),
      createMockColumn('spec', 'Empty', emptySpec.id),
    ]

    const orderedSpecs = [
      {
        columnIndex: 1,
        column: columns[1],
        specification: emptySpec,
        order: 0,
      },
    ]

    const result = generateCombinations(orderedSpecs, columns)
    expect(result).toHaveLength(0)
  })

  it('preserves empty cells for non-spec columns', () => {
    const spec = createMockSpec('Color', [
      { displayValue: 'Red', skuFragment: 'R' },
    ])

    const columns: ColumnDef[] = [
      createMockColumn('sku', 'SKU'),
      createMockColumn('spec', 'Color', spec.id),
      createMockColumn('free', 'Notes'),
    ]

    const orderedSpecs = [
      {
        columnIndex: 1,
        column: columns[1],
        specification: spec,
        order: 0,
      },
    ]

    const result = generateCombinations(orderedSpecs, columns)

    expect(result).toHaveLength(1)
    expect(result[0][0]).toEqual({}) // SKU column is empty
    expect(result[0][1]?.v).toBe('Red')
    expect(result[0][2]).toEqual({}) // Notes column is empty
  })
})
