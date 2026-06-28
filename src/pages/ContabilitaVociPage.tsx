import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useLookupSezioniRendiconto, useVociContabilita } from "@/hooks/useVociContabilita"
import { usePermission } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import type { VoceContabilita } from "@/types/voce-contabilita"
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
import VoceContabilitaFormDialog from "@/components/contabilita/VoceContabilitaFormDialog"
import DeleteVoceContabilitaDialog from "@/components/contabilita/DeleteVoceContabilitaDialog"

const PAGE_SIZE = 20
const COLUMNS = 5
const ALL_SEZIONI = "__all__"

export default function ContabilitaVociPage() {
  const { banda } = useBanda()
  const canWrite = usePermission("contabilita:write")
  const [page, setPage] = useState(1)
  const [sezioneFilter, setSezioneFilter] = useState(ALL_SEZIONI)
  const { data, isLoading, isError } = useVociContabilita(banda!.codice, page, PAGE_SIZE, !!banda)
  const sezioni = useLookupSezioniRendiconto()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VoceContabilita | null>(null)
  const [deleting, setDeleting] = useState<VoceContabilita | null>(null)

  const totalPages = data?.meta.total_pages ?? 1
  const colCount = canWrite ? COLUMNS : COLUMNS - 1

  const voci = useMemo(() => {
    const items = data?.items ?? []
    if (sezioneFilter === ALL_SEZIONI) return items
    const codice = Number(sezioneFilter)
    return items.filter((v) => v.sezione_rendiconto_codice === codice)
  }, [data, sezioneFilter])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (voce: VoceContabilita) => {
    setEditing(voce)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Piano dei conti</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova voce
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="filtro-sezione" className="text-sm text-muted-foreground">
          Sezione
        </Label>
        <Select value={sezioneFilter} onValueChange={setSezioneFilter}>
          <SelectTrigger id="filtro-sezione" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SEZIONI}>Tutte le sezioni</SelectItem>
            {(sezioni.data ?? []).map((s) => (
              <SelectItem key={s.codice} value={String(s.codice)}>
                {s.descrizione}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome voce</TableHead>
                <TableHead>Sezione</TableHead>
                <TableHead>Voce rendiconto</TableHead>
                <TableHead>Sottovoce</TableHead>
                {canWrite && <TableHead className="text-right">Azioni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: colCount }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">
                    Errore nel caricamento delle voci.
                  </TableCell>
                </TableRow>
              ) : voci.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">
                    Nessuna voce configurata. Le voci minime vengono create automaticamente alla
                    prima configurazione anno.
                  </TableCell>
                </TableRow>
              ) : (
                voci.map((voce) => (
                  <TableRow key={voce.id}>
                    <TableCell className="font-medium">{voce.voce_contabilita}</TableCell>
                    <TableCell>{voce.sezione_rendiconto?.descrizione ?? "—"}</TableCell>
                    <TableCell>{voce.voce_rendiconto?.descrizione ?? "—"}</TableCell>
                    <TableCell>{voce.sottovoce_rendiconto?.descrizione ?? "—"}</TableCell>
                    {canWrite && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(voce)}
                            aria-label="Modifica"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(voce)}
                            aria-label="Elimina"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
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

      <VoceContabilitaFormDialog open={formOpen} onOpenChange={setFormOpen} voce={editing} />
      <DeleteVoceContabilitaDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        voce={deleting}
      />
    </div>
  )
}
