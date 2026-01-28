# SKU Generator

A React application for defining product specifications and auto-generating SKU codes in a spreadsheet interface.

## Features

- **Config Sheet**: Define specifications with value-to-SKU code mappings
- **Auto-SKU Generation**: SKUs generate automatically as you select values
- **Dropdown Selection**: Column headers link to Config specs for easy data entry
- **Multi-Sheet Support**: Create multiple data sheets sharing the same specifications
- **Import/Export**: Excel and CSV support for data portability
- **Customizable Settings**: Configure delimiter, prefix, and suffix for SKU format
- **Guided Tour**: Interactive onboarding for new users

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Documentation

See [GUIDE.md](./GUIDE.md) for comprehensive documentation covering:
- Getting started and app overview
- Config sheet setup and specification management
- Data sheet creation and column headers
- Dropdown usage and SKU generation
- Settings configuration
- Import/export workflows
- Tips, best practices, and troubleshooting

## Tech Stack

- React + TypeScript (Vite)
- Tailwind CSS + shadcn/ui
- Zustand (state management with localStorage persistence)
- Fortune-Sheet (spreadsheet component)
- Driver.js (guided tours)

## Development

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run typecheck  # TypeScript type checking
npm run lint       # ESLint
npm run test       # Run tests
```

## License

MIT
