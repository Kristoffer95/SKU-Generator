# SKU Generator User Guide

A comprehensive guide to using the SKU Generator application for creating and managing product SKU codes.

## Table of Contents

- [Getting Started](#getting-started)
- [Config Sheet](#config-sheet)
- [Adding Specifications](#adding-specifications)
- [Data Sheets](#data-sheets)
- [Column Headers](#column-headers)
- [Using Dropdowns](#using-dropdowns)
- [SKU Generation](#sku-generation)
- [Settings](#settings)
- [Import and Export](#import-and-export)
- [Multi-Sheet Workflow](#multi-sheet-workflow)
- [Tips and Best Practices](#tips-and-best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

SKU Generator is a web application that helps you create standardized SKU (Stock Keeping Unit) codes for your products. The app uses a spreadsheet interface where you:

1. **Define specifications** in the Config sheet (e.g., Color, Size, Material)
2. **Map values to SKU codes** (e.g., "Red" → "R", "Large" → "L")
3. **Create data sheets** with columns matching your specifications
4. **Auto-generate SKUs** as you select values from dropdowns

### First Launch

When you first open the app, you'll see:
- **Left sidebar**: Shows your specifications (initially empty)
- **Spreadsheet area**: Contains the Config sheet with header columns
- **Header bar**: Import, Export, and Tour buttons

Click the **Tour** button (question mark icon) to take an interactive guided tour of all features.

## Config Sheet

The **Config** sheet is the single source of truth for all your specifications. It's always the first tab (styled in orange) and cannot be deleted or renamed.

### Config Sheet Structure

| Specification | Value     | SKU Code |
|---------------|-----------|----------|
| Color         | Red       | R        |
| Color         | Blue      | B        |
| Color         | Green     | G        |
| Size          | Small     | S        |
| Size          | Medium    | M        |
| Size          | Large     | L        |

- **Specification**: The category name (e.g., Color, Size, Material)
- **Value**: The human-readable option (e.g., Red, Large)
- **SKU Code**: The abbreviated code used in the generated SKU (e.g., R, L)

### Adding Entries Directly

You can add specification entries directly in the Config sheet:
1. Click on the Config tab
2. Add a new row below the header
3. Enter the specification name, value, and SKU code

### How Specifications Are Grouped

Rows with the same Specification name are automatically grouped together. For example, all rows with "Color" as the Specification become values under the "Color" specification.

## Adding Specifications

There are two ways to add specifications:

### Method 1: Using the Add Specification Dialog

1. In the left sidebar, click **"Add Specification"**
2. Enter the specification name (e.g., "Material")
3. Add values with their SKU codes:
   - Value: "Cotton", SKU Code: "COT"
   - Value: "Polyester", SKU Code: "POL"
4. Click **Add** to save

This automatically:
- Adds rows to the Config sheet
- Adds a column with the spec name to the active data sheet

### Method 2: Editing the Config Sheet Directly

1. Switch to the Config tab
2. Add new rows with your specification data
3. The sidebar updates automatically to reflect changes

## Data Sheets

Data sheets are where you enter your product data and generate SKUs.

### Creating a New Data Sheet

1. Click the **+** button in the sheet tab bar (bottom of spreadsheet)
2. A new "Sheet 1" (or next number) is created
3. Double-click the tab to rename it (e.g., "Winter Collection")

### Data Sheet Structure

| SKU       | Color | Size   | Material |
|-----------|-------|--------|----------|
| R-L-COT   | Red   | Large  | Cotton   |
| B-S-POL   | Blue  | Small  | Polyester|

- **Column A (SKU)**: Auto-generated, read-only display of the combined SKU
- **Columns B+**: Your specification columns matching names from Config

### Deleting Data Sheets

Click the **X** on any data sheet tab to delete it. The Config sheet cannot be deleted.

## Column Headers

Column headers in data sheets link to specifications defined in the Config sheet.

### How Headers Work

1. Header names must **exactly match** specification names in Config
2. Case-sensitive: "Color" and "color" are different
3. Matching headers enable dropdown selection for that column

### Setting Up Headers

For a new data sheet:
1. Row 1 is the header row
2. Column A should be "SKU" (auto-filled)
3. Add spec names in columns B, C, D, etc.

Example header row: `SKU | Color | Size | Material`

## Using Dropdowns

When a column header matches a specification name, cells in that column show dropdown menus.

### Selecting Values

1. Click any cell below a spec header (e.g., under "Color")
2. A dropdown appears with values from Config (Red, Blue, Green)
3. Select a value
4. The SKU in Column A updates automatically

### Dropdown Availability

- Dropdowns only appear for columns matching Config specifications
- Row 1 (headers) does not have dropdowns
- Dropdowns show all values defined for that specification

## SKU Generation

SKUs are automatically generated in Column A based on selected values.

### Generation Rules

1. **Order**: SKU codes are joined in the order columns appear (left to right)
2. **Delimiter**: Codes are joined with a separator (default: hyphen `-`)
3. **Empty Values**: Columns without selections are skipped

### Example

| Column | Header   | Value Selected | SKU Code |
|--------|----------|----------------|----------|
| B      | Color    | Red            | R        |
| C      | Size     | Large          | L        |
| D      | Material | Cotton         | COT      |

Generated SKU: `R-L-COT`

### When SKUs Update

SKUs regenerate whenever:
- A cell value is changed via dropdown selection
- Settings are modified (delimiter, prefix, suffix)
- Any value in the row changes

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

Clicking **Save** immediately recalculates all SKUs in all data sheets.

## Import and Export

### Exporting

Click the **Export** button in the header to access options:

#### Export to Excel (.xlsx)
- Creates a workbook with all sheets (Config + data sheets)
- Config sheet is always first
- File downloads as `sku-data.xlsx`

#### Export Current Sheet to CSV
- Exports only the currently active sheet
- Downloads as `[sheet-name].csv`

### Importing

Click **Import** to select an Excel file (.xlsx or .xls):

1. Select a file from your computer
2. The file is parsed and loaded
3. **All current data is replaced** with imported data
4. If the file contains a "Config" sheet, it becomes the spec source

### Round-Trip Compatibility

Exported files can be re-imported without data loss. The Config sheet is detected automatically (case-insensitive match).

## Multi-Sheet Workflow

Use multiple data sheets to organize products by category, season, or any grouping.

### All Sheets Share Config

Every data sheet:
- Uses the same specifications from Config
- Has access to the same dropdown values
- Generates SKUs using the same settings

### Workflow Example

1. Create Config with: Brand, Category, Color
2. Create "Summer 2024" data sheet for summer products
3. Create "Winter 2024" data sheet for winter products
4. Both sheets use the same Brand/Category/Color dropdowns
5. Export all sheets together to one Excel file

### Switching Between Sheets

Click any tab at the bottom to switch sheets. The sidebar always shows specs from Config.

## Tips and Best Practices

### Naming Conventions

- Use consistent specification names across your workflow
- Keep SKU codes short (1-4 characters)
- Avoid special characters in SKU codes

### Organizing Specifications

- List specifications in a logical order (general → specific)
- Group related values together in Config sheet
- Use clear, descriptive value names

### Efficient Data Entry

1. Set up all specifications in Config first
2. Create data sheet with correct headers
3. Use Tab/Enter to navigate between cells
4. Select from dropdowns for fast, accurate entry

### SKU Design

- Start with the most general attribute (e.g., category)
- End with the most specific (e.g., variant)
- Consider prefix for brand/year identification
- Keep total SKU length reasonable (8-15 characters)

### Backup Your Work

- Export to Excel regularly
- Config sheet exports with your data
- Excel files can be shared and re-imported

## Troubleshooting

### Dropdown Not Appearing

**Problem**: Clicking a cell doesn't show a dropdown

**Solutions**:
- Check the column header matches a Config specification exactly
- Verify the specification has values defined in Config
- Ensure you're not clicking on Row 1 (header row)

### SKU Not Generating

**Problem**: SKU column stays empty

**Solutions**:
- Verify Column A header is "SKU"
- Check that selected values have SKU codes in Config
- Confirm you're on a data sheet, not the Config sheet

### Wrong SKU Codes

**Problem**: Generated SKU uses wrong codes

**Solutions**:
- Check Config sheet for the correct value-to-code mappings
- Verify the column header matches the specification name exactly
- Review settings for unexpected prefix/suffix/delimiter

### Import Not Working

**Problem**: Imported file doesn't load correctly

**Solutions**:
- Ensure file is .xlsx or .xls format
- Check that Config sheet (if present) has correct column headers
- Verify the file isn't corrupted or password-protected

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
