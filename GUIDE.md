# SKU Generator User Guide

A comprehensive guide to using the SKU Generator application for creating and managing product SKU codes.

## Table of Contents

- [Getting Started](#getting-started)
- [Understanding the Interface](#understanding-the-interface)
- [Adding Specifications](#adding-specifications)
- [Managing Specification Values](#managing-specification-values)
- [Adding Columns](#adding-columns)
- [Using Dropdowns](#using-dropdowns)
- [SKU Generation](#sku-generation)
- [Settings](#settings)
- [Multi-Sheet Workflow](#multi-sheet-workflow)
- [Import and Export](#import-and-export)
- [Tips and Best Practices](#tips-and-best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

SKU Generator is a web application that helps you create standardized SKU (Stock Keeping Unit) codes for your products. The app uses a spreadsheet interface where you:

1. **Define specifications** in the sidebar (e.g., Color, Size, Material)
2. **Map values to SKU codes** (e.g., "Red" → "R", "Large" → "L")
3. **Add specification columns** to your spreadsheet
4. **Auto-generate SKUs** as you select values from dropdowns

### First Launch

When you first open the app, you'll see:
- **Left sidebar**: Manage your specifications (initially empty)
- **Spreadsheet area**: Your data sheet with the SKU column
- **Header bar**: Import, Export, Settings, and Tour buttons
- **Sheet tabs**: At the bottom for multi-sheet navigation

Click the **Tour** button (question mark icon) to take an interactive guided tour of all features.

## Understanding the Interface

### Sidebar
The collapsible sidebar on the left is your specification management area:
- View all specifications as expandable cards
- Edit specification names by clicking the pencil icon
- Edit values and SKU codes inline
- Drag to reorder specifications (affects SKU fragment order)
- Delete specifications with the trash icon

### Spreadsheet Area
The main spreadsheet where you enter product data:
- **Column A (SKU)**: Auto-generated, read-only SKU codes
- **Spec columns**: Columns linked to specifications (show dropdowns)
- **Free columns**: Plain text columns for notes (don't affect SKU)
- **Toolbar**: Undo, Redo, Add Row, Add Column buttons

### Sheet Tabs
At the bottom of the spreadsheet:
- Click tabs to switch between sheets
- Double-click to rename a sheet
- Click X to delete (not available for the last sheet)
- Click + to add a new sheet

Each sheet has its own independent set of specifications and data.

## Adding Specifications

Specifications define the categories and values that make up your SKUs.

### Using the Add Specification Dialog

1. In the left sidebar, click **"Add Specification"**
2. Enter the specification name (e.g., "Material")
3. Add values with their SKU codes:
   - Value: "Cotton", SKU Code: "COT"
   - Value: "Polyester", SKU Code: "POL"
4. Click **Add** to save

This creates the specification in the sidebar. To use it in your spreadsheet, you need to add a column (see [Adding Columns](#adding-columns)).

### Editing Specification Names

To rename a specification after creation:
1. Find the specification in the sidebar
2. Click the **pencil icon** next to the name
3. Type the new name
4. Press **Enter** to save or **Escape** to cancel

Column headers that use this specification will update automatically.

## Managing Specification Values

### Viewing Values
Click on any specification card in the sidebar to expand it and see all values with their SKU codes.

### Editing Values
1. Click on a value row to enter edit mode
2. Modify the display value or SKU code
3. Press **Enter** to save or **Escape** to cancel

SKU codes must be unique within each specification.

### Adding Values
When creating a specification, use the **"Add Value"** button to add more value/code pairs.

### Deleting Specifications
1. Click the **trash icon** on a specification card
2. Confirm deletion in the dialog
3. Any columns using that specification will also be removed

## Adding Columns

There are two ways to add columns to your spreadsheet:

### Using the Toolbar Button
1. Click **"Add Column"** in the spreadsheet toolbar
2. Choose the column type:
   - **Specification**: Links to a spec for dropdown selection
   - **Free**: Plain text column (doesn't affect SKU)
3. For spec columns, select an existing specification or create a new one
4. Choose where to insert (at end or before a specific column)
5. Click **Add Column**

### Using the Context Menu
1. Right-click on any column header
2. Choose **"Insert column before"** or **"Insert column after"**
3. Complete the Add Column dialog

### Reordering Columns
Drag column headers left or right to reorder them. The SKU column always stays in the first position.

### Deleting Columns
1. Right-click on the column header
2. Select **"Delete column"**
3. Confirm deletion (SKU column cannot be deleted)

## Using Dropdowns

Specification columns automatically show dropdown menus for data entry.

### Selecting Values
1. Click any cell in a specification column
2. A dropdown appears with all values from that spec
3. Select a value
4. The SKU in Column A updates automatically

### Keyboard Navigation
- **Tab** / **Enter**: Confirm selection and move to next cell
- **Escape**: Cancel editing

## SKU Generation

SKUs are automatically generated in Column A based on selected values.

### How SKUs Are Built

1. **Order**: SKU codes are combined based on specification order in the sidebar (not column order)
2. **Delimiter**: Codes are joined with a separator (default: hyphen `-`)
3. **Empty Values**: Cells without selections are skipped
4. **Free Columns**: Values in free columns don't affect the SKU

### Example

| Sidebar Order | Specification | Selected Value | SKU Code |
|---------------|---------------|----------------|----------|
| 1             | Color         | Red            | R        |
| 2             | Size          | Large          | L        |
| 3             | Material      | Cotton         | COT      |

Generated SKU: `R-L-COT`

### Reordering Specification Order
Drag specifications in the sidebar to change the order of fragments in generated SKUs.

### Duplicate SKU Warning
When multiple rows generate the same SKU, those SKU cells are highlighted in amber. Check the validation panel at the bottom for details.

## Settings

Access settings by clicking the **Settings** button in the sidebar footer.

### Available Settings

| Setting   | Description                        | Default |
|-----------|------------------------------------|---------|
| Delimiter | Character(s) between SKU codes     | `-`     |
| Prefix    | String prepended to all SKUs       | (empty) |
| Suffix    | String appended to all SKUs        | (empty) |

### Delimiter Options

- **Hyphen** (`-`): `R-L-COT`
- **Underscore** (`_`): `R_L_COT`
- **None**: `RLCOT`
- **Custom**: Enter any string (e.g., `.` → `R.L.COT`)

### Prefix and Suffix

- Prefix "PRD-" with suffix "-2024": `PRD-R-L-COT-2024`
- Prefix "SKU_": `SKU_R-L-COT`

### Applying Changes

Clicking **Save** immediately recalculates all SKUs across all sheets.

## Multi-Sheet Workflow

Use multiple sheets to organize products by category, season, or any grouping.

### Sheet Independence

Each sheet has:
- Its own set of specifications
- Its own columns configuration
- Its own data rows

Specifications are NOT shared between sheets. This allows different product categories to have different attribute structures.

### Creating a New Sheet

1. Click the **+** button in the sheet tab bar
2. A new sheet is created with 50 empty rows and only the SKU column
3. Double-click the tab to rename it (e.g., "Winter Collection")
4. Add specifications and columns as needed

### Workflow Example

1. Create "T-Shirts" sheet with: Color, Size specifications
2. Create "Pants" sheet with: Color, Waist, Length specifications
3. Each sheet generates SKUs based on its own specifications
4. Export all sheets together to one Excel file

### Switching Between Sheets

Click any tab at the bottom to switch sheets. The sidebar updates to show that sheet's specifications.

## Import and Export

### Exporting

Click the **Export** button in the header to access options:

#### Export to Excel (.xlsx)
- Creates a workbook with all sheets
- File downloads as `sku-data.xlsx`

#### Export Current Sheet to CSV
- Exports only the currently active sheet
- Downloads as `[sheet-name].csv`

### Importing

Click **Import** to select an Excel or CSV file:

1. Select a file from your computer
2. The file is parsed and loaded
3. **All current data is replaced** with imported data
4. SKUs are regenerated for imported data

### Round-Trip Compatibility

Exported files can be re-imported without data loss.

## Tips and Best Practices

### Naming Conventions

- Use consistent specification names across your workflow
- Keep SKU codes short (1-4 characters)
- Avoid special characters in SKU codes

### Organizing Specifications

- Order specifications by importance in the sidebar
- The order determines SKU fragment order
- More general attributes first (category), specific ones last (variant)

### Efficient Data Entry

1. Set up all specifications first
2. Add columns for each specification needed
3. Use Tab/Enter to navigate between cells
4. Select from dropdowns for fast, accurate entry

### Using Free Columns

Free columns are useful for:
- Notes or comments
- Internal reference numbers
- Data that shouldn't affect the SKU

### SKU Design

- Start with the most general attribute (e.g., category)
- End with the most specific (e.g., variant)
- Consider prefix for brand/year identification
- Keep total SKU length reasonable (8-15 characters)

### Undo/Redo

Use the toolbar buttons or:
- Changes can be undone/redone
- Includes cell edits, column reordering, and row additions

### Backup Your Work

- Export to Excel regularly
- Excel files can be shared and re-imported

## Troubleshooting

### Dropdown Not Appearing

**Problem**: Clicking a cell doesn't show a dropdown

**Solutions**:
- Ensure the column is a specification column (not a free column)
- Check that the specification has values defined
- The SKU column and header row don't have dropdowns

### SKU Not Generating

**Problem**: SKU column stays empty

**Solutions**:
- Make sure you have specification columns (not just free columns)
- Check that cells have values selected from dropdowns
- Verify specifications have SKU codes defined for values

### Wrong SKU Codes

**Problem**: Generated SKU uses wrong codes

**Solutions**:
- Check specification values in the sidebar for correct SKU codes
- Review the specification order in the sidebar
- Review settings for unexpected prefix/suffix/delimiter

### Import Not Working

**Problem**: Imported file doesn't load correctly

**Solutions**:
- Ensure file is .xlsx, .xls, or .csv format
- Verify the file isn't corrupted or password-protected
- Try exporting a sample file first to see the expected format

### Data Not Saving

**Problem**: Changes disappear after refresh

**Solutions**:
- Data is saved to browser localStorage automatically
- Try a different browser if localStorage is disabled
- Export your work for permanent backup

### Performance Issues

**Problem**: App becomes slow with large datasets

**Solutions**:
- Split large datasets into multiple sheets
- Limit rows to a few hundred per sheet
- Close unused browser tabs to free memory
