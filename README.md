# SKU Generator

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)

A powerful React application for defining product specifications and auto-generating SKU codes in an intuitive spreadsheet interface.

## Screenshots

<!-- TODO: Add screenshots of the application -->
![Main Interface](./screenshots/main-interface.png)
*Main interface with specification sidebar and spreadsheet view*

![SKU Generation](./screenshots/sku-generation.png)
*Auto-generated SKU codes from dropdown selections*

## Features

### Specification Management
- **Create specifications** with custom names and multiple values
- **Map values to SKU codes** (e.g., "Red" → "RD", "Blue" → "BL")
- **Reorder specifications** with drag-and-drop
- **Edit and delete** specifications easily
- **Color-coded values** for visual distinction in dropdowns

### Spreadsheet Features
- **Full-featured spreadsheet** with familiar editing controls
- **Undo/Redo** support with unlimited history
- **Cell formatting**: background color, text color, bold, italic, alignment
- **Checkbox cells** for boolean data tracking
- **Column and row operations**: insert, delete, resize, pin
- **Drag-and-drop column reordering** to change SKU generation order
- **Context menus** for quick row/column operations
- **Click-to-navigate validation** for error correction

### SKU Generation
- **Auto-generated SKUs** as you select dropdown values
- **Configurable format**: delimiter, prefix, and suffix settings
- **Real-time updates** when specifications or settings change
- **Duplicate SKU detection** with warning highlights

### Advanced Features
- **Auto Populate**: Generate all possible SKU combinations automatically
- **Separate Blocks**: Insert blank rows between groups of identical values
- **Pinned columns and rows** that stay visible while scrolling
- **Resizable columns and rows** with drag-to-resize borders
- **Cell style copy/paste** with keyboard shortcuts

### Multi-Sheet Support
- **Multiple sheets** with independent data and specifications
- **Sheet groups** to organize related sheets with color coding
- **Duplicate sheets** to quickly create variations
- **Sheet tab navigation** with rename and delete options

### Import/Export
- **Import from Excel** (.xlsx, .xls) to load existing data
- **Export to Excel** (.xlsx) with all sheets and formatting
- **Export to CSV** for single sheet data
- **Export to PDF** with table formatting (single or all sheets)
- **Export preview** to review before downloading

### Guided Tour
- **Two-tour system**: Basic Tour (18 steps) for new users, Advanced Tour (28 steps) for power users
- **Interactive walkthroughs** with step-by-step guidance
- **Tour selection modal** for first-time users
- **Resume anytime** via the guided tour button

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sku-generator.git
cd sku-generator

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (TypeScript compile + Vite build) |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint for code quality |
| `npm run test` | Run Vitest unit tests |

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [React 18](https://react.dev/) | UI framework |
| [TypeScript 5](https://www.typescriptlang.org/) | Type safety |
| [Vite 6](https://vitejs.dev/) | Build tool and dev server |
| [Tailwind CSS 3](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | UI component library |
| [Zustand 5](https://zustand-demo.pmnd.rs/) | State management with localStorage persistence |
| [react-spreadsheet](https://github.com/iddan/react-spreadsheet) | Spreadsheet component |
| [Driver.js](https://driverjs.com/) | Interactive guided tours |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [jsPDF](https://github.com/parallax/jsPDF) | PDF generation |
| [xlsx](https://sheetjs.com/) | Excel import/export |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + A` | Select all cells |
| `Ctrl/Cmd + B` | Toggle bold |
| `Ctrl/Cmd + I` | Toggle italic |
| `Alt/Opt + Ctrl/Cmd + C` | Copy cell styles |
| `Alt/Opt + Ctrl/Cmd + V` | Paste cell styles |
| `Space` | Toggle checkbox (when selected) |
| `Shift + Space` | Select entire row |
| `Delete / Backspace` | Clear cell contents |
| `Enter` | Confirm edit and move down |
| `Tab` | Confirm edit and move right |
| `Arrow keys` | Navigate cells |

## Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui base components
│   └── spreadsheet/     # Spreadsheet-specific components
├── lib/                 # Core logic and utilities
│   ├── auto-sku.ts      # SKU auto-generation logic
│   ├── guided-tour.ts   # Tour definitions and state
│   ├── import-export.ts # Excel/CSV import/export
│   ├── pdf-export.ts    # PDF export functionality
│   └── validation.ts    # Data validation rules
├── store/               # Zustand state stores
│   ├── sheets.ts        # Sheet and data management
│   ├── settings.ts      # App settings (delimiter, prefix, suffix)
│   └── specifications.ts # Specification CRUD operations
├── types/               # TypeScript type definitions
└── test/                # Test utilities and setup
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass (`npm run test`)
- TypeScript compiles without errors (`npm run typecheck`)
- Code follows ESLint rules (`npm run lint`)

## License

MIT
