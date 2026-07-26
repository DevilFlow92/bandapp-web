import { Fragment, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useProve } from "@/hooks/useProve"
import { usePermission } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import type { Prova } from "@/types/prova"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatIndirizzoServizio } from "@/components/indirizzi/IndirizzoField"
import ProvaFormDialog from "@/components/prove/ProvaFormDialog"
import DeleteProvaDialog from "@/components/prove/DeleteProvaDialog"
import OrganicoPanel from "@/components/attivita/OrganicoPanel"
import RepertorioPanel from "@/components/attivita/RepertorioPanel"

const PAGE_SIZE = 20

/** Formats an ISO datetime string as "DD/MM/YYYY HH:MM". */
function formatDataProva(iso: string): string {
  const [datePart, timePart = ""] = iso.split("T")
  const [year, month, day] = datePart.split("-")
  if (!year || !month || !day) return iso
  const time = timePart.slice(0, 5)
  return time ? `${day}/${month}/${year} ${time}` : `${day}/${month}/${year}`
}

function formatNote(note: string | null): string {
  if (!note) return "—"
  return note.length > 50 ? `${note.slice(0, 50)}…` : note
}

export default function ProvePage() {
  const { banda } = useBanda()
  const canWrite = usePermission("servizi:write")
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useProve(page, PAGE_SIZE, banda!.codice, undefined, !!banda)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Prova | null>(null)
  const [deleting, setDeleting] = useState<Prova | null>(null)
  // Only one prova's panels are expanded at a time.
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const toggleExpanded = (id: number) => setExpandedId((current) => (current === id ? null : id))

  const prove = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1
  const colCount = canWrite ? 6 : 5

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (prova: Prova) => {
    setEditing(prova)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Prove</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova prova
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Data</TableHead>
                <TableHead>Servizio</TableHead>
                <TableHead>Indirizzo</TableHead>
                <TableHead>Note</TableHead>
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
                    Errore nel caricamento delle prove.
                  </TableCell>
                </TableRow>
              ) : prove.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">
                    Nessuna prova trovata
                  </TableCell>
                </TableRow>
              ) : (
                prove.map((prova) => {
                  const expanded = expandedId === prova.id
                  return (
                    <Fragment key={prova.id}>
                      <TableRow>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpanded(prova.id)}
                            aria-label={expanded ? "Comprimi" : "Espandi"}
                            aria-expanded={expanded}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDataProva(prova.data_prova)}
                        </TableCell>
                        <TableCell>{prova.servizio?.descrizione_servizio ?? "—"}</TableCell>
                        <TableCell>{formatIndirizzoServizio(prova.indirizzo)}</TableCell>
                        <TableCell>{formatNote(prova.note)}</TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(prova)}
                                aria-label="Modifica"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleting(prova)}
                                aria-label="Elimina"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {expanded && (
                        <>
                          <OrganicoPanel container={{ provaId: prova.id }} colSpan={colCount} />
                          <RepertorioPanel container={{ provaId: prova.id }} colSpan={colCount} />
                        </>
                      )}
                    </Fragment>
                  )
                })
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

      <ProvaFormDialog open={formOpen} onOpenChange={setFormOpen} prova={editing} />
      <DeleteProvaDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        prova={deleting}
      />
    </div>
  )
}
