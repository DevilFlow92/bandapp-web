import { useEffect, useRef, type ReactNode } from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import type { JSONContent } from "@tiptap/core"
import { Bold, Heading1, Heading2, Heading3, Italic, Pilcrow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Mergefield } from "@/components/modulistica/MergefieldNode"
import MergefieldLibrary from "@/components/modulistica/MergefieldLibrary"

const ONCHANGE_DEBOUNCE_MS = 500

interface TemplateEditorProps {
  initialContent: object
  onChange: (json: object) => void
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
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
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
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
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        code: false,
        codeBlock: false,
        hardBreak: false,
        horizontalRule: false,
        link: false,
        strike: false,
        underline: false,
        heading: { levels: [1, 2, 3] },
      }),
      Mergefield,
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
        <EditorContent
          editor={editor}
          className={cn(
            "min-h-[400px] px-4 py-3 text-sm [&_.ProseMirror]:min-h-[380px] [&_.ProseMirror]:outline-none",
            "[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold",
            "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-semibold",
            "[&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-lg [&_h3]:font-semibold",
            "[&_p]:mb-2",
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
