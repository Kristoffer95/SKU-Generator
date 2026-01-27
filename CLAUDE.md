# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SKU Generator - A React application that lets users define specifications with value-to-SKU code mappings, enabling auto-generation of SKU codes in a spreadsheet interface.

## Tech Stack (per PRD)

- React with TypeScript (Vite)
- Tailwind CSS + shadcn/ui
- Framer Motion for animations
- Zustand for state management (with localStorage persistence)
- Fortune-Sheet for spreadsheet functionality

## Build & Development Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run typecheck  # Run TypeScript type checking
npm run lint       # Run ESLint
npm run test       # Run Vitest tests
```

## Automated Development Scripts

- `./ralph.sh <iterations>` - Runs Claude in Docker sandbox for iterative PRD implementation
- `./ralph-once.sh` - Single iteration of PRD-driven development

Both scripts use `prd.json` for task tracking and `progress.txt` for logging completed work.

## PRD-Driven Development

The project uses `prd.json` as a task tracker:
- Each item has `id`, `category`, `description`, `stepsToVerify`, and `passes` fields
- Work on items with `passes: false`
- Update `passes: true` when complete
- Log progress to `progress.txt` (prepend new entries, don't overwrite)
- Run all feedback loops (typecheck, lint, test) before committing

## Architecture (Planned)

```
src/
├── types/index.ts          # TypeScript interfaces (Specification, SpecValue, AppSettings)
├── store/
│   ├── specifications.ts   # Zustand store for specs CRUD
│   ├── sheets.ts           # Multi-sheet management
│   └── settings.ts         # App configuration (delimiter, prefix, suffix)
├── lib/
│   └── sku-generator.ts    # Core SKU generation logic
└── components/
    ├── AppLayout           # Main layout with collapsible sidebar
    ├── SpecificationList   # Animated spec management sidebar
    ├── SpreadsheetContainer# Fortune-Sheet wrapper
    └── SheetTabs           # Multi-sheet tab bar
```

## Key Features to Implement

1. **Specification Management**: CRUD for specs with values mapped to SKU codes
2. **Fortune-Sheet Integration**: Dropdown validation per spec column, auto-SKU generation
3. **SKU Generation**: Combine selected values' codes with configurable delimiter/prefix/suffix
4. **Multi-Sheet Support**: Independent data per sheet tab
5. **Import/Export**: Excel and CSV support
