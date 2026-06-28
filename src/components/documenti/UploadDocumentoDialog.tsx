import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useLookupTipiDocumento, useUploadDocumento } from "@/hooks/useDocumenti"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const NONE_VALUE = "__none__"

interface UploadDocumentoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UploadDocumentoDialog({ open, onOpenChange }: UploadDocumentoDialogProps) {
  const { toast } = useToast()
  const upload = useUploadDocumento()
  const tipiDocumento = useLookupTipiDocumento()

  const [file, setFile] = useState<File | null>(null)
  const [tipo, setTipo] = useState<string>(NONE_VALUE)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFile(null)
    setTipo(NONE_VALUE)
    setNote("")
    setError(null)
  }, [open])

  const isUploading = upload.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!file) {
      setError("Seleziona un file da caricare.")
      return
    }

    try {
      await upload.mutateAsync({
        file,
        tipo_documento_codice: tipo === NONE_VALUE ? undefined : Number(tipo),
        note: note.trim() || undefined,
      })
      toast({ title: "Documento caricato" })
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carica documento</DialogTitle>
          <DialogDescription>
            Seleziona un file e, facoltativamente, indica tipo e note.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <Input
              id="file"
              type="file"
              required
              disabled={isUploading}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_documento">Tipo documento</Label>
            <Select value={tipo} onValueChange={setTipo} disabled={isUploading}>
              <SelectTrigger id="tipo_documento">
                <SelectValue placeholder="Seleziona…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Nessun tipo</SelectItem>
                {tipiDocumento.data?.map((t) => (
                  <SelectItem key={t.codice} value={String(t.codice)}>
                    {t.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <textarea
              id="note"
              rows={3}
              disabled={isUploading}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {isUploading && (
            <div className="space-y-2" role="status" aria-live="polite">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento in corso…
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Carica
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
