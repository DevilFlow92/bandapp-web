import { mergeAttributes, Node } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react"
import { AlertCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import api from "@/lib/api"
import { cn } from "@/lib/utils"

export interface ImageAttributes {
  documentoId: number
  width?: number
  align?: "left" | "center" | "right"
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      /** Inserts an image node at the current cursor position. */
      insertImage: (documentoId: number, width?: number, align?: string) => ReturnType
    }
  }
}

const IMG_MIN_WIDTH = 50
const IMG_MAX_WIDTH = 800
const RESIZE_HANDLE_SIZE = 12

function ImageView({ node, selected, updateAttributes }: ReactNodeViewProps) {
  const attrs = node.attrs as ImageAttributes
  const { documentoId, width, align = "left" } = attrs
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const resizeStartRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchImage = async () => {
      setLoading(true)
      setError(false)
      try {
        const { data } = await api.get<Blob>(`/documenti/${documentoId}/download`, {
          responseType: "blob",
        })
        if (mounted) {
          const url = URL.createObjectURL(data)
          objectUrlRef.current = url
          setImageUrl(url)
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setError(true)
          setLoading(false)
        }
      }
    }

    fetchImage()

    return () => {
      mounted = false
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [documentoId])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (!imgRef.current) return

      const startX = e.clientX
      const startWidth = width || imgRef.current.offsetWidth
      resizeStartRef.current = { startX, startWidth }
      setIsDragging(true)

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeStartRef.current || !imgRef.current) return
        const delta = e.clientX - resizeStartRef.current.startX
        const newWidth = Math.max(
          IMG_MIN_WIDTH,
          Math.min(IMG_MAX_WIDTH, resizeStartRef.current.startWidth + delta),
        )
        updateAttributes({ width: Math.round(newWidth) })
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        resizeStartRef.current = null
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [width, updateAttributes],
  )

  const alignClass = align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : ""

  return (
    <NodeViewWrapper as="div" className={cn("my-2", alignClass)}>
      <div className="relative inline-block max-w-full">
        {loading && (
          <div className="flex h-40 w-60 items-center justify-center rounded border border-dashed border-muted-foreground/30 bg-muted/20">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
              <span className="text-xs">Caricamento...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex h-40 w-60 items-center justify-center rounded border border-dashed border-destructive/30 bg-destructive/10">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <span className="text-xs">Immagine non disponibile</span>
            </div>
          </div>
        )}

        {!loading && !error && imageUrl && (
          <>
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Template"
              draggable={false}
              contentEditable={false}
              className={cn(
                "block max-w-full",
                selected && "ring-2 ring-ring ring-offset-1",
                isDragging && "select-none",
              )}
              style={{
                width: width ? `${width}px` : "auto",
                height: "auto",
              }}
            />
            {selected && (
              <div
                onMouseDown={handleResizeStart}
                className={cn(
                  "absolute right-0 bottom-0 -mr-1 -mb-1 cursor-se-resize rounded-full bg-primary",
                  "hover:ring-2 hover:ring-ring hover:ring-offset-1",
                  isDragging && "ring-2 ring-ring ring-offset-1",
                )}
                style={{
                  width: `${RESIZE_HANDLE_SIZE}px`,
                  height: `${RESIZE_HANDLE_SIZE}px`,
                }}
              />
            )}
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const Image = Node.create({
  name: "image",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      documentoId: {
        default: null,
        parseHTML: (element) => {
          const id = element.getAttribute("data-documento-id")
          return id ? Number(id) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.documentoId) return {}
          return { "data-documento-id": String(attributes.documentoId) }
        },
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const w = element.getAttribute("data-width")
          return w ? Number(w) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          return { "data-width": String(attributes.width) }
        },
      },
      align: {
        default: "left",
        parseHTML: (element) => element.getAttribute("data-align") || "left",
        renderHTML: (attributes) => {
          const align = attributes.align || "left"
          return { "data-align": align }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: "img[data-documento-id]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  },

  addCommands() {
    return {
      insertImage:
        (documentoId: number, width?: number, align?: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { documentoId, width, align },
          }),
    }
  },
})
