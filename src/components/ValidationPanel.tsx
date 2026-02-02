import { useMemo } from "react"
import { AlertTriangle, AlertCircle, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { ValidationError } from "@/lib/validation"

interface ValidationPanelProps {
  errors: ValidationError[]
  onErrorClick?: (error: ValidationError) => void
  onDismiss?: () => void
}

/**
 * Get icon component based on error type
 */
function getErrorIcon(type: ValidationError["type"]) {
  switch (type) {
    case "duplicate-sku":
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
    case "missing-value":
      return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
    default:
      return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
  }
}

/**
 * Get background color class based on error type
 */
function getErrorBgClass(type: ValidationError["type"]) {
  switch (type) {
    case "duplicate-sku":
      return "hover:bg-amber-50"
    case "missing-value":
      return "hover:bg-red-50"
    default:
      return "hover:bg-red-50"
  }
}

/**
 * Panel component that displays validation errors below the spreadsheet.
 * - Shows count and list of errors
 * - Clicking an error navigates to the affected cell
 * - Hides when no errors exist
 */
export function ValidationPanel({ errors, onErrorClick, onDismiss }: ValidationPanelProps) {
  // Group errors by type for summary
  const errorSummary = useMemo(() => {
    const missingValues = errors.filter((e) => e.type === "missing-value").length
    const duplicateSKUs = errors.filter((e) => e.type === "duplicate-sku").length
    return { missingValues, duplicateSKUs, total: errors.length }
  }, [errors])

  // Don't render anything if there are no errors
  if (errors.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="border-t bg-muted/30"
        data-testid="validation-panel"
        data-tour="validation-panel"
      >
        {/* Header with summary */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {errorSummary.total} {errorSummary.total === 1 ? "issue" : "issues"} found
            </span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {errorSummary.missingValues > 0 && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  {errorSummary.missingValues} invalid {errorSummary.missingValues === 1 ? "value" : "values"}
                </span>
              )}
              {errorSummary.duplicateSKUs > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  {errorSummary.duplicateSKUs} duplicate {errorSummary.duplicateSKUs === 1 ? "SKU" : "SKUs"}
                </span>
              )}
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-7 w-7 p-0"
              data-testid="dismiss-validation"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Error list */}
        <div className="max-h-32 overflow-y-auto">
          <ul className="divide-y">
            {errors.map((error, index) => (
              <li key={`${error.row}-${error.column}-${index}`}>
                <button
                  onClick={() => onErrorClick?.(error)}
                  className={`w-full px-4 py-2 flex items-center gap-3 text-left text-sm transition-colors ${getErrorBgClass(error.type)}`}
                  data-testid="validation-error-item"
                >
                  {getErrorIcon(error.type)}
                  <span className="flex-1 truncate">{error.message}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Row {error.row}, Col {error.column}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
