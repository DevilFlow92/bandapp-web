import { mergeAttributes, Node } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react"
import { Tag } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MergefieldAttributes {
  chiave: string
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mergefield: {
      /** Inserts a mergefield node (e.g. "socio.nome") at the current cursor position. */
      insertMergefield: (chiave: string) => ReturnType
    }
  }
}

function MergefieldView({ node, selected }: ReactNodeViewProps) {
  const chiave = node.attrs.chiave as string

  return (
    <NodeViewWrapper as="span" className="inline-block align-baseline">
      <span
        contentEditable={false}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary select-none",
          selected && "ring-2 ring-ring ring-offset-1",
        )}
      >
        <Tag className="h-3 w-3" />
        {chiave}
      </span>
    </NodeViewWrapper>
  )
}

export const Mergefield = Node.create({
  name: "mergefield",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      chiave: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mergefield"),
        renderHTML: (attributes) => {
          if (!attributes.chiave) return {}
          return { "data-mergefield": attributes.chiave }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-mergefield]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), HTMLAttributes["data-mergefield"] ?? ""]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MergefieldView)
  },

  addCommands() {
    return {
      insertMergefield:
        (chiave: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { chiave } }),
    }
  },
})
