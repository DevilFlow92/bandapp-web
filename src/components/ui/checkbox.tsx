import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "onChange"
> {
  checked?: boolean | "indeterminate"
  onCheckedChange?: (checked: boolean) => void
}

/**
 * Minimal checkbox built on a native <input>, styled to match shadcn/ui.
 * No @radix-ui/react-checkbox dependency: the only extra behavior needed
 * here (indeterminate) is a native DOM property, not a Radix-only feature.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement)

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = checked === "indeterminate"
      }
    }, [checked])

    return (
      <input
        type="checkbox"
        ref={innerRef}
        checked={checked === "indeterminate" ? false : (checked ?? false)}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm border border-primary text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    )
  },
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
