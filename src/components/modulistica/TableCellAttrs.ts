import { TableCell, TableHeader } from "@tiptap/extension-table"

export type CellTextAlign = "left" | "center" | "right" | "justify"

const ALLOWED_ALIGN: readonly CellTextAlign[] = ["left", "center", "right", "justify"]
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i

function parseCellAlign(element: HTMLElement): CellTextAlign | null {
  const value = (element.style.textAlign || element.getAttribute("align") || "")
    .trim()
    .toLowerCase()
  return (ALLOWED_ALIGN as readonly string[]).includes(value) ? (value as CellTextAlign) : null
}

function parseHexColor(value: string | null): string | null {
  return value && HEX_COLOR_RE.test(value) ? value : null
}

function parseBorderWidth(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed
}

/**
 * Stock TableCell/TableHeader already ship colspan/rowspan/colwidth (needed for
 * merge/split cells) plus a basic `align` attribute that doesn't support
 * "justify". Each addAttributes() call below spreads the parent's attrs so
 * those keep working, then overrides `align` and adds the CR#8b style attrs.
 */
function cellStyleAttributes() {
  return {
    align: {
      default: null,
      parseHTML: (element: HTMLElement) => parseCellAlign(element),
      renderHTML: (attributes: Record<string, unknown>) => {
        const align = attributes.align as CellTextAlign | null
        return align ? { style: `text-align: ${align}` } : {}
      },
    },
    borderColor: {
      default: null,
      parseHTML: (element: HTMLElement) => parseHexColor(element.style.borderColor || null),
      renderHTML: (attributes: Record<string, unknown>) => {
        const borderColor = attributes.borderColor as string | null
        return borderColor ? { style: `border-color: ${borderColor}` } : {}
      },
    },
    borderWidth: {
      default: null,
      parseHTML: (element: HTMLElement) => parseBorderWidth(element.style.borderWidth || null),
      renderHTML: (attributes: Record<string, unknown>) => {
        const borderWidth = attributes.borderWidth as number | null
        return borderWidth != null ? { style: `border-width: ${borderWidth}px` } : {}
      },
    },
    backgroundColor: {
      default: null,
      parseHTML: (element: HTMLElement) => parseHexColor(element.style.backgroundColor || null),
      renderHTML: (attributes: Record<string, unknown>) => {
        const backgroundColor = attributes.backgroundColor as string | null
        return backgroundColor ? { style: `background-color: ${backgroundColor}` } : {}
      },
    },
  }
}

export const TableCellWithAttrs = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...cellStyleAttributes(),
    }
  },
})

export const TableHeaderWithAttrs = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...cellStyleAttributes(),
    }
  },
})
