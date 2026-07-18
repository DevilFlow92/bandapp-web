import { useMemo, useState } from "react"
import { ImageOff } from "lucide-react"
import { API_URL } from "@/lib/api"
import { useImmaginiArchivio } from "@/hooks/useDocumenti"
import { cn } from "@/lib/utils"
import type { Documento } from "@/types/documento"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ImagePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (documentoId: number) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Dialog per scegliere un'immagine già presente in archivio da inserire nel template. */
export default function ImagePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: ImagePickerDialogProps) {
  const [search, setSearch] = useState("")
  const { data: immagini, isLoading } = useImmaginiArchivio(open)

  const filtrate = useMemo(() => {
    const query = search.trim().toLowerCase()
    const items = immagini ?? []
    if (!query) return items
    return items.filter((d) => d.nome.toLowerCase().includes(query))
  }, [immagini, search])

  function handleSelect(documento: Documento) {
    onSelect(documento.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Scegli immagine dall&apos;archivio</DialogTitle>
          <DialogDescription>
            Seleziona un&apos;immagine già presente in archivio da inserire nel documento.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Cerca per nome file..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-md" />
            ))}
          </div>
        )}

        {!isLoading && filtrate.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <ImageOff className="h-8 w-8" />
            <p className="text-sm">Nessuna immagine in archivio</p>
          </div>
        )}

        {!isLoading && filtrate.length > 0 && (
          <div className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {filtrate.map((documento) => (
              <button
                key={documento.id}
                type="button"
                onClick={() => handleSelect(documento)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-md border border-input p-2 text-left transition-colors",
                  "hover:border-primary hover:bg-accent",
                )}
              >
                <img
                  src={`${API_URL}/documenti/${documento.id}/preview`}
                  alt={documento.nome}
                  className="h-24 w-full rounded bg-muted object-contain"
                />
                <span className="w-full truncate text-xs font-medium" title={documento.nome}>
                  {documento.nome}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(documento.dimensione_bytes)}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
