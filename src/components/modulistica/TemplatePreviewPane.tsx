import { AlertCircle, Loader2 } from "lucide-react"

interface TemplatePreviewPaneProps {
  html?: string
  isLoading: boolean
  error?: string | null
  /** Whether the template is loaded and has content to preview. */
  isReady: boolean
}

export default function TemplatePreviewPane({
  html,
  isLoading,
  error,
  isReady,
}: TemplatePreviewPaneProps) {
  if (!isReady) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-md border p-4 text-center text-sm text-muted-foreground">
        Caricamento del modulo…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-2 rounded-md border p-4 text-center text-sm text-destructive">
        <AlertCircle className="h-6 w-6" />
        <span>{error}</span>
      </div>
    )
  }

  if (isLoading || !html) {
    return (
      <div className="flex min-h-[500px] items-center justify-center gap-2 rounded-md border p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Generazione anteprima…
      </div>
    )
  }

  return (
    <iframe
      title="Anteprima modulo"
      srcDoc={html}
      // No allow-same-origin: the document is server-rendered from mergefield data we
      // don't fully control, so it's kept in an opaque origin with no access to the
      // parent app/cookies. allow-scripts is still needed for the paged.js pagination.
      sandbox="allow-scripts"
      className="h-full min-h-[600px] w-full rounded-md border bg-white"
    />
  )
}
