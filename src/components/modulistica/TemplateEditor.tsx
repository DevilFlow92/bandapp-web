import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import { FontFamily, Color, TextStyle, FontSize } from "@tiptap/extension-text-style"
import { Table } from "@tiptap/extension-table"
import type { JSONContent } from "@tiptap/core"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  Combine,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Minus,
  MoveVertical,
  Outdent,
  Paintbrush,
  Palette,
  Pilcrow,
  Plus,
  RemoveFormatting,
  Rows3,
  SplitSquareHorizontal,
  Table as TableIcon,
  Trash2,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Mergefield } from "@/components/modulistica/MergefieldNode"
import { Image } from "@/components/modulistica/ImageNode"
import MergefieldLibrary from "@/components/modulistica/MergefieldLibrary"
import { useUploadDocumento } from "@/hooks/useDocumenti"
import {
  ROW_MIN_HEIGHT,
  TableRowResizing,
  TableRowWithHeight,
} from "@/components/modulistica/TableRowResize"
import {
  TableCellWithAttrs,
  TableHeaderWithAttrs,
  type CellTextAlign,
} from "@/components/modulistica/TableCellAttrs"

const ONCHANGE_DEBOUNCE_MS = 500

const ALLOWED_FONTS = ["Arial", "Times New Roman", "Calibri", "Georgia", "Verdana"] as const

const DEFAULT_FONT_SIZE_PT = 11
const MIN_FONT_SIZE_PT = 1
const FONT_SIZE_STEP_PT = 1

function parseFontSizePt(fontSize: string | null | undefined): number {
  if (!fontSize) return DEFAULT_FONT_SIZE_PT
  const match = /^([\d.]+)pt$/.exec(fontSize)
  return match ? parseFloat(match[1]) : DEFAULT_FONT_SIZE_PT
}

const IMAGE_BUBBLE_MENU_OPTIONS = {
  placement: "top-start",
  offset: 8,
} as const

function imageBubbleMenuShouldShow({ editor }: { editor: Editor }) {
  return editor.isActive("image")
}

interface TemplateEditorProps {
  initialContent: object
  onChange: (json: object) => void
}

function ToolbarButton({
  active,
  onClick,
  label,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="h-8 px-2"
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function ImageWidthInput({ editor }: { editor: Editor }) {
  const width = editor.getAttributes("image").width as number | null | undefined

  return (
    <div className="flex items-center gap-1 px-1" title="Larghezza immagine (px)">
      <ImageIcon className="h-4 w-4 text-muted-foreground" />
      <input
        type="number"
        min={50}
        placeholder="Auto"
        value={width ?? ""}
        onChange={(e) => {
          const raw = e.target.value
          const value = raw === "" ? null : Math.max(50, Number(raw))
          editor.chain().focus().updateAttributes("image", { width: value }).run()
        }}
        className="h-8 w-16 rounded border border-input bg-transparent px-1 text-xs"
      />
    </div>
  )
}

function ImageAlignButtons({ editor }: { editor: Editor }) {
  const align = editor.getAttributes("image").align as string | null

  return (
    <>
      <ToolbarButton
        active={align === "left"}
        onClick={() => editor.chain().focus().updateAttributes("image", { align: "left" }).run()}
        label="Allinea immagine a sinistra"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={align === "center"}
        onClick={() => editor.chain().focus().updateAttributes("image", { align: "center" }).run()}
        label="Allinea immagine al centro"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={align === "right"}
        onClick={() => editor.chain().focus().updateAttributes("image", { align: "right" }).run()}
        label="Allinea immagine a destra"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
    </>
  )
}

function ImageBubbleMenu({ editor }: { editor: Editor }) {
  const getReferencedVirtualElement = useCallback(() => {
    const { selection } = editor.state
    const dom = editor.view.domAtPos(selection.from).node
    const element = dom.nodeType === Node.ELEMENT_NODE ? (dom as HTMLElement) : dom.parentElement
    const imgEl = element?.closest("img")
    if (!imgEl) return null
    return {
      getBoundingClientRect: () => imgEl.getBoundingClientRect(),
      contextElement: imgEl,
    }
  }, [editor])

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageBubbleMenu"
      shouldShow={imageBubbleMenuShouldShow}
      options={IMAGE_BUBBLE_MENU_OPTIONS}
      getReferencedVirtualElement={getReferencedVirtualElement}
      className="flex flex-wrap items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
    >
      <ImageAlignButtons editor={editor} />
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ImageWidthInput editor={editor} />
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1 px-2 text-xs"
        title="Elimina immagine"
        onClick={() => editor.chain().focus().deleteSelection().run()}
      >
        <Trash2 className="h-4 w-4" />
        Elimina
      </Button>
    </BubbleMenu>
  )
}

function InsertImageButton({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadDocumento = useUploadDocumento()

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      uploadDocumento.mutate(
        { file },
        {
          onSuccess: (data) => {
            editor.chain().focus().insertImage(data.id).run()
            if (fileInputRef.current) {
              fileInputRef.current.value = ""
            }
          },
        },
      )
    },
    [editor, uploadDocumento],
  )

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        title="Inserisci immagine"
        disabled={uploadDocumento.isPending}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploadDocumento.isPending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </Button>
    </>
  )
}

const TABLE_GRID_MAX = 8

function TableGridPicker({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null)

  return (
    <div className="p-2">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${TABLE_GRID_MAX}, 1rem)` }}
        onMouseLeave={() => setHovered(null)}
      >
        {Array.from({ length: TABLE_GRID_MAX * TABLE_GRID_MAX }).map((_, i) => {
          const row = Math.floor(i / TABLE_GRID_MAX)
          const col = i % TABLE_GRID_MAX
          const active = hovered !== null && row <= hovered.row && col <= hovered.col
          return (
            <button
              key={i}
              type="button"
              className={cn(
                "h-4 w-4 border",
                active ? "border-primary bg-primary/30" : "border-muted-foreground/30",
              )}
              onMouseEnter={() => setHovered({ row, col })}
              onClick={() => onSelect(row + 1, col + 1)}
            />
          )
        })}
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        {hovered ? `${hovered.row + 1} x ${hovered.col + 1}` : "Seleziona dimensioni"}
      </p>
    </div>
  )
}

function TableToolbarButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 px-2 text-xs"
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {label}
    </Button>
  )
}

const TABLE_BUBBLE_MENU_OPTIONS = {
  placement: "top-start",
  offset: 8,
} as const

function tableBubbleMenuShouldShow({ editor }: { editor: Editor }) {
  return editor.isActive("table")
}

function RowHeightInput({ editor }: { editor: Editor }) {
  const height = editor.getAttributes("tableRow").height as number | null | undefined

  return (
    <div className="flex items-center gap-1 px-1" title="Altezza riga (px)">
      <MoveVertical className="h-4 w-4 text-muted-foreground" />
      <input
        type="number"
        min={ROW_MIN_HEIGHT}
        placeholder="Auto"
        value={height ?? ""}
        onChange={(e) => {
          const raw = e.target.value
          const value = raw === "" ? null : Math.max(ROW_MIN_HEIGHT, Number(raw))
          editor.chain().focus().setRowHeight(editor.state.selection.from, value).run()
        }}
        className="h-8 w-16 rounded border border-input bg-transparent px-1 text-xs"
      />
    </div>
  )
}

function currentCellAttrs(editor: Editor) {
  return editor.isActive("tableHeader")
    ? editor.getAttributes("tableHeader")
    : editor.getAttributes("tableCell")
}

function AutoColumnWidthToggle({ editor }: { editor: Editor }) {
  const colwidth = currentCellAttrs(editor).colwidth as number[] | null | undefined
  const isAuto = !colwidth

  return (
    <TableToolbarButton
      label="Larghezza automatica"
      disabled={isAuto}
      onClick={() => editor.chain().focus().setCellAttribute("colwidth", null).run()}
    >
      <Wand2 className="h-4 w-4" />
    </TableToolbarButton>
  )
}

function CellAlignButtons({ editor }: { editor: Editor }) {
  const align = currentCellAttrs(editor).align as CellTextAlign | null

  return (
    <>
      <ToolbarButton
        active={align === "left"}
        onClick={() => editor.chain().focus().setCellAttribute("align", "left").run()}
        label="Allinea cella a sinistra"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={align === "center"}
        onClick={() => editor.chain().focus().setCellAttribute("align", "center").run()}
        label="Allinea cella al centro"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={align === "right"}
        onClick={() => editor.chain().focus().setCellAttribute("align", "right").run()}
        label="Allinea cella a destra"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
    </>
  )
}

function CellBorderControls({ editor }: { editor: Editor }) {
  const attrs = currentCellAttrs(editor)
  const borderColor = (attrs.borderColor as string | null) || "#000000"
  const borderWidth = attrs.borderWidth as number | null

  return (
    <div className="flex items-center gap-1 px-1">
      <input
        type="color"
        title="Colore bordo cella"
        value={borderColor}
        onChange={(e) =>
          editor.chain().focus().setCellAttribute("borderColor", e.target.value).run()
        }
        className="h-8 w-8 cursor-pointer rounded border border-input"
      />
      <input
        type="number"
        min={0}
        title="Spessore bordo (px)"
        placeholder="px"
        value={borderWidth ?? ""}
        onChange={(e) => {
          const raw = e.target.value
          const value = raw === "" ? null : Math.max(0, Number(raw))
          editor.chain().focus().setCellAttribute("borderWidth", value).run()
        }}
        className="h-8 w-14 rounded border border-input bg-transparent px-1 text-xs"
      />
    </div>
  )
}

function CellBackgroundControl({ editor }: { editor: Editor }) {
  const backgroundColor = (currentCellAttrs(editor).backgroundColor as string | null) || "#ffffff"

  return (
    <input
      type="color"
      title="Colore sfondo cella"
      value={backgroundColor}
      onChange={(e) =>
        editor.chain().focus().setCellAttribute("backgroundColor", e.target.value).run()
      }
      className="h-8 w-8 cursor-pointer rounded border border-input"
    />
  )
}

function ResetCellStyleButton({ editor }: { editor: Editor }) {
  return (
    <TableToolbarButton
      label="Reset stile cella"
      onClick={() =>
        editor
          .chain()
          .focus()
          .setCellAttribute("align", null)
          .setCellAttribute("borderColor", null)
          .setCellAttribute("borderWidth", null)
          .setCellAttribute("backgroundColor", null)
          .run()
      }
    >
      <Eraser className="h-4 w-4" />
    </TableToolbarButton>
  )
}

function TableToolbar({ editor }: { editor: Editor }) {
  const getReferencedVirtualElement = useCallback(() => {
    const { selection } = editor.state
    const dom = editor.view.domAtPos(selection.from).node
    const element = dom.nodeType === Node.ELEMENT_NODE ? (dom as HTMLElement) : dom.parentElement
    const tableEl = element?.closest("table")
    if (!tableEl) return null
    return {
      getBoundingClientRect: () => tableEl.getBoundingClientRect(),
      contextElement: tableEl,
    }
  }, [editor])

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBubbleMenu"
      shouldShow={tableBubbleMenuShouldShow}
      options={TABLE_BUBBLE_MENU_OPTIONS}
      getReferencedVirtualElement={getReferencedVirtualElement}
      className="flex flex-wrap items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
    >
      <TableToolbarButton
        label="Aggiungi riga"
        disabled={!editor.can().addRowAfter()}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        <Rows3 className="h-4 w-4" />
      </TableToolbarButton>
      <TableToolbarButton
        label="Elimina riga"
        disabled={!editor.can().deleteRow()}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        <Trash2 className="h-4 w-4" />
      </TableToolbarButton>
      <RowHeightInput editor={editor} />

      <Separator orientation="vertical" className="mx-1 h-6" />

      <TableToolbarButton
        label="Aggiungi colonna"
        disabled={!editor.can().addColumnAfter()}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <Columns3 className="h-4 w-4" />
      </TableToolbarButton>
      <TableToolbarButton
        label="Elimina colonna"
        disabled={!editor.can().deleteColumn()}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        <Trash2 className="h-4 w-4" />
      </TableToolbarButton>
      <AutoColumnWidthToggle editor={editor} />

      <Separator orientation="vertical" className="mx-1 h-6" />

      <TableToolbarButton
        label="Unisci celle"
        disabled={!editor.can().mergeCells()}
        onClick={() => editor.chain().focus().mergeCells().run()}
      >
        <Combine className="h-4 w-4" />
      </TableToolbarButton>
      <TableToolbarButton
        label="Dividi cella"
        disabled={!editor.can().splitCell()}
        onClick={() => editor.chain().focus().splitCell().run()}
      >
        <SplitSquareHorizontal className="h-4 w-4" />
      </TableToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <CellAlignButtons editor={editor} />
      <CellBorderControls editor={editor} />
      <CellBackgroundControl editor={editor} />
      <ResetCellStyleButton editor={editor} />

      <Separator orientation="vertical" className="mx-1 h-6" />

      <TableToolbarButton
        label="Elimina tabella"
        disabled={!editor.can().deleteTable()}
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        <Trash2 className="h-4 w-4" />
      </TableToolbarButton>
    </BubbleMenu>
  )
}

function FontSizeControls({ editor }: { editor: Editor }) {
  const currentPt = parseFontSizePt(editor.getAttributes("textStyle").fontSize as string | null)

  const applyFontSize = (pt: number) => {
    const clamped = Math.max(MIN_FONT_SIZE_PT, pt)
    editor.chain().focus().setFontSize(`${clamped}pt`).run()
  }

  return (
    <div className="flex items-center gap-1 px-1" title="Dimensione testo (pt)">
      <ToolbarButton
        active={false}
        onClick={() => applyFontSize(currentPt - FONT_SIZE_STEP_PT)}
        label="Riduci dimensione testo"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>
      <input
        type="number"
        min={MIN_FONT_SIZE_PT}
        value={currentPt}
        onChange={(e) => {
          const raw = Number(e.target.value)
          if (Number.isNaN(raw)) return
          applyFontSize(raw)
        }}
        className="h-8 w-14 rounded border border-input bg-transparent px-1 text-xs"
      />
      <ToolbarButton
        active={false}
        onClick={() => applyFontSize(currentPt + FONT_SIZE_STEP_PT)}
        label="Aumenta dimensione testo"
      >
        <Plus className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}

interface CopiedFormat {
  bold: boolean
  italic: boolean
  color: string | null
  fontFamily: string | null
  fontSize: string | null
}

function captureFormat(editor: Editor): CopiedFormat {
  const attrs = editor.getAttributes("textStyle")
  return {
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    color: (attrs.color as string | null) ?? null,
    fontFamily: (attrs.fontFamily as string | null) ?? null,
    fontSize: (attrs.fontSize as string | null) ?? null,
  }
}

function applyFormat(editor: Editor, format: CopiedFormat) {
  let chain = editor.chain().focus()
  chain = format.bold ? chain.setBold() : chain.unsetBold()
  chain = format.italic ? chain.setItalic() : chain.unsetItalic()
  chain = format.color ? chain.setColor(format.color) : chain.unsetColor()
  chain = format.fontFamily ? chain.setFontFamily(format.fontFamily) : chain.unsetFontFamily()
  chain = format.fontSize ? chain.setFontSize(format.fontSize) : chain.unsetFontSize()
  chain.run()
}

function useFormatPainter(editor: Editor) {
  const [formatoCopiato, setFormatoCopiato] = useState<CopiedFormat | null>(null)

  useEffect(() => {
    if (!formatoCopiato) return

    let applied = false
    const handleSelectionUpdate = () => {
      if (applied) return
      const { from, to } = editor.state.selection
      if (from === to) return
      applied = true
      applyFormat(editor, formatoCopiato)
      setFormatoCopiato(null)
    }

    editor.on("selectionUpdate", handleSelectionUpdate)
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, formatoCopiato])

  return [formatoCopiato, setFormatoCopiato] as const
}

function FormatPainterButton({ editor }: { editor: Editor }) {
  const [formatoCopiato, setFormatoCopiato] = useFormatPainter(editor)
  const isActive = formatoCopiato !== null
  const noSelection = editor.state.selection.empty

  return (
    <ToolbarButton
      active={isActive}
      disabled={!isActive && noSelection}
      onClick={() => {
        if (isActive) {
          setFormatoCopiato(null)
          return
        }
        if (noSelection) return
        setFormatoCopiato(captureFormat(editor))
      }}
      label={
        isActive ? "Pennello attivo: seleziona il testo di destinazione" : "Copia formattazione"
      }
    >
      <Paintbrush className="h-4 w-4" />
    </ToolbarButton>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const [tableMenuOpen, setTableMenuOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2">
      <ToolbarButton
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
        label="Paragrafo"
      >
        <Pilcrow className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        label="Titolo 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Titolo 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        label="Titolo 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Grassetto"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Corsivo"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        label="Allinea a sinistra"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        label="Allinea al centro"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        label="Allinea a destra"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        label="Giustifica"
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <div className="flex items-center gap-1">
        <Select
          value={(editor.getAttributes("textStyle").fontFamily as string) || ""}
          onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            {ALLOWED_FONTS.map((font) => (
              <SelectItem key={font} value={font}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <input
            type="color"
            title="Colore testo"
            defaultValue="#000000"
            value={(editor.getAttributes("textStyle").color as string) || "#000000"}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="h-8 w-8 cursor-pointer rounded border border-input"
          />
          <Palette className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 opacity-40" />
        </div>

        <FontSizeControls editor={editor} />
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        active={false}
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
        label="Cancella formattazione"
      >
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>
      <FormatPainterButton editor={editor} />

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Elenco puntato"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Elenco numerato"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      {(editor.isActive("bulletList") || editor.isActive("orderedList")) && (
        <>
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
            label="Aumenta rientro"
          >
            <IndentIncrease className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().liftListItem("listItem").run()}
            label="Riduci rientro"
          >
            <Outdent className="h-4 w-4" />
          </ToolbarButton>
        </>
      )}

      <Separator orientation="vertical" className="mx-1 h-6" />

      <DropdownMenu open={tableMenuOpen} onOpenChange={setTableMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={editor.isActive("table") ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2"
            title="Inserisci tabella"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <TableGridPicker
            onSelect={(rows, cols) => {
              editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
              setTableMenuOpen(false)
            }}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <InsertImageButton editor={editor} />
    </div>
  )
}

export default function TemplateEditor({ initialContent, onChange }: TemplateEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        hardBreak: false,
        horizontalRule: false,
        link: false,
        strike: false,
        underline: false,
        heading: { levels: [1, 2, 3] },
      }),
      TextAlign.configure({
        types: ["paragraph", "heading"],
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Table.configure({ resizable: true }),
      TableRowWithHeight,
      TableHeaderWithAttrs,
      TableCellWithAttrs,
      TableRowResizing,
      Mergefield,
      Image,
    ],
    content: initialContent as JSONContent,
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onChangeRef.current(editor.getJSON())
      }, ONCHANGE_DEBOUNCE_MS)
    },
  })

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (!editor) return null

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="rounded-md border md:w-[70%]">
        <Toolbar editor={editor} />
        <TableToolbar editor={editor} />
        <ImageBubbleMenu editor={editor} />
        <EditorContent
          editor={editor}
          className={cn(
            "min-h-[400px] px-4 py-3 text-sm [&_.ProseMirror]:min-h-[380px] [&_.ProseMirror]:outline-none",
            "[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold",
            "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-semibold",
            "[&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-lg [&_h3]:font-semibold",
            "[&_p]:mb-2",
            "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-6",
            "[&_ul_ul]:[list-style-type:circle] [&_ul_ul]:pl-10",
            "[&_ul_ul_ul]:[list-style-type:square] [&_ul_ul_ul]:pl-14",
            "[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_ol_ol]:[list-style-type:lower-alpha] [&_ol_ol]:pl-10",
            "[&_ol_ol_ol]:[list-style-type:lower-roman] [&_ol_ol_ol]:pl-14",
            "[&_li]:mb-1",
            "[&_.tableWrapper]:my-2 [&_.tableWrapper]:overflow-x-auto",
            "[&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_table]:overflow-hidden",
            "[&_td]:relative [&_td]:box-border [&_td]:min-w-[75px] [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top",
            "[&_th]:relative [&_th]:box-border [&_th]:min-w-[75px] [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_th]:align-top [&_th]:font-semibold",
            "[&_.column-resize-handle]:pointer-events-none [&_.column-resize-handle]:absolute [&_.column-resize-handle]:bottom-0 [&_.column-resize-handle]:right-[-2px] [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:z-20 [&_.column-resize-handle]:w-1 [&_.column-resize-handle]:bg-primary/50",
            "[&_.ProseMirror.resize-cursor]:cursor-col-resize",
            "[&_.row-resize-handle]:pointer-events-none [&_.row-resize-handle]:absolute [&_.row-resize-handle]:bottom-[-2px] [&_.row-resize-handle]:left-0 [&_.row-resize-handle]:right-0 [&_.row-resize-handle]:z-20 [&_.row-resize-handle]:h-1 [&_.row-resize-handle]:bg-primary/50",
            "[&_.ProseMirror.row-resize-cursor]:cursor-row-resize",
            "[&_.selectedCell]:after:pointer-events-none [&_.selectedCell]:after:absolute [&_.selectedCell]:after:inset-0 [&_.selectedCell]:after:z-[2] [&_.selectedCell]:after:bg-primary/10 [&_.selectedCell]:after:content-['']",
          )}
        />
      </div>
      <div className="md:w-[30%]">
        <MergefieldLibrary
          onInsert={(chiave) => editor.chain().focus().insertMergefield(chiave).run()}
        />
      </div>
    </div>
  )
}
