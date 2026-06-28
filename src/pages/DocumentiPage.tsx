import { useState } from "react"
import { ChevronLeft, ChevronRight, Download, Eye, Plus, Trash2 } from "lucide-react"
import {
  downloadDocumento,
  previewDocumento,
  useDocumenti,
  useLookupTipiDocumento,
} from "@/hooks/useDocumenti"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { usePermission } from "@/hooks/useAuth"
import type { Documento } from "@/types/documento"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import UploadDocumentoDialog from "@/components/documenti/UploadDocumentoDialog"
import DeleteDocumentoDialog from "@/components/documenti/DeleteDocumentoDialog"

const PAGE_SIZE = 20
const ALL = "all"

/** Formats a byte count as "X KB" below 1 MB, "X.X MB" otherwise. */
function formatBytes(bytes: number): string {
  const MB = 1024 * 1024
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

/** Formats an ISO datetime as "DD/MM/YYYY HH:MM" using its wall-clock value. */
function formatDateTime(iso: string): string {
  const [date, time = ""] = iso.split("T")
  const [year, month, day] = date.split("-")
  if (!year || !month || !day) return iso
  const hhmm = time.slice(0, 5)
  return hhmm ? `${day}/${month}/${year} ${hhmm}` : `${day}/${month}/${year}`
}

function formatNote(note: string | null): string {
  if (!note) return "—"
  return note.length > 40 ? `${note.slice(0, 40)}…` : note
}

export default function DocumentiPage() {
  const { toast } = useToast()
  const canWrite = usePermission("archivio:write")
  const [page, setPage] = useState(1)
  const [tipoFilter, setTipoFilter] = useState<string>(ALL)

  const tipoDocumentoCodice = tipoFilter === ALL ? undefined : Number(tipoFilter)

  const { data, isLoading, isError } = useDocumenti(page, PAGE_SIZE, tipoDocumentoCodice)
  const tipiDocumento = useLookupTipiDocumento()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleting, setDeleting] = useState<Documento | null>(null)

  const documenti = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1

  const handleTipoChange = (value: string) => {
    setTipoFilter(value)
    setPage(1)
  }

  const handleDownload = async (documento: Documento) => {
    try {
      await downloadDocumento(documento.id, documento.nome)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: getErrorMessage(err),
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Documenti</h1>
        {canWrite && (
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Carica documento
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="tipo-filter" className="text-sm text-muted-foreground">
            Tipo documento
          </Label>
          <Select value={tipoFilter} onValueChange={handleTipoChange}>
            <SelectTrigger id="tipo-filter" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti i tipi</SelectItem>
              {tipiDocumento.data?.map((t) => (
                <SelectItem key={t.codice} value={String(t.codice)}>
                  {t.descrizione}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Dimensione</TableHead>
                <TableHead>Data caricamento</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    Errore nel caricamento dei documenti.
                  </TableCell>
                </TableRow>
              ) : documenti.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    Nessun documento caricato
                  </TableCell>
                </TableRow>
              ) : (
                documenti.map((documento) => (
                  <TableRow key={documento.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleDownload(documento)}
                        className="text-left font-medium text-primary hover:underline"
                      >
                        {documento.nome}
                      </button>
                    </TableCell>
                    <TableCell>{documento.tipo_documento?.descrizione ?? "—"}</TableCell>
                    <TableCell>{formatBytes(documento.dimensione_bytes)}</TableCell>
                    <TableCell>{formatDateTime(documento.caricato_il)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatNote(documento.note)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {documento.mime_type === "application/pdf" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Anteprima"
                            onClick={() => previewDocumento(documento.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(documento)}
                          aria-label="Scarica"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(documento)}
                            aria-label="Elimina"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pagina {data?.meta.page ?? page} di {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Precedente
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            Successiva
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <UploadDocumentoDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <DeleteDocumentoDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        documento={deleting}
      />
    </div>
  )
}
