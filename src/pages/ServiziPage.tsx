import { Fragment, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useServizi } from "@/hooks/useServizi"
import { useRicevute } from "@/hooks/useRicevute"
import { usePermission } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import type { Servizio } from "@/types/servizio"
import type { Ricevuta } from "@/types/ricevuta"
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
import ServizioFormDialog, {
  formatIndirizzoServizio,
} from "@/components/servizi/ServizioFormDialog"
import DeleteServizioDialog from "@/components/servizi/DeleteServizioDialog"
import RicevutaFormDialog from "@/components/ricevute/RicevutaFormDialog"
import DeleteRicevutaDialog from "@/components/ricevute/DeleteRicevutaDialog"

const PAGE_SIZE = 20
const ALL_YEARS = "all"

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [
  CURRENT_YEAR + 2,
  CURRENT_YEAR + 1,
  CURRENT_YEAR,
  CURRENT_YEAR - 1,
  CURRENT_YEAR - 2,
]

/** Formats an ISO datetime string as "DD/MM/YYYY HH:MM". */
function formatDataServizio(iso: string): string {
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

/** Formats an ISO datetime string as "DD/MM/YYYY". */
function formatData(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function formatImporto(importo: number): string {
  return `€ ${importo.toFixed(2)}`
}

/** Inline sub-row listing the ricevute of a single servizio. */
function ServizioRicevutePanel({ servizioId, colSpan }: { servizioId: number; colSpan: number }) {
  const { data, isLoading, isError } = useRicevute(servizioId)
  const canWrite = usePermission("servizi:write")
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Ricevuta | null>(null)

  const ricevute = data?.items ?? []
  const ricevuteColCount = canWrite ? 5 : 4

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="bg-muted/30 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Ricevute</h3>
            {canWrite && (
              <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi ricevuta
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Esterno</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Note in stampa</TableHead>
                    {canWrite && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: ricevuteColCount }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={ricevuteColCount}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Errore nel caricamento delle ricevute.
                      </TableCell>
                    </TableRow>
                  ) : ricevute.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={ricevuteColCount}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nessuna ricevuta per questo servizio
                      </TableCell>
                    </TableRow>
                  ) : (
                    ricevute.map((ricevuta) => (
                      <TableRow key={ricevuta.id}>
                        <TableCell>
                          {ricevuta.esterno
                            ? `${ricevuta.esterno.persona?.nome ?? ""} ${ricevuta.esterno.persona?.cognome ?? ""}`.trim() ||
                              ricevuta.esterno.codice_esterno
                            : "—"}
                        </TableCell>
                        <TableCell>{formatData(ricevuta.data_ricevuta)}</TableCell>
                        <TableCell>{formatImporto(ricevuta.importo)}</TableCell>
                        <TableCell>{formatNote(ricevuta.note_in_stampa)}</TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleting(ricevuta)}
                              aria-label="Elimina"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <RicevutaFormDialog servizioId={servizioId} open={formOpen} onOpenChange={setFormOpen} />
        <DeleteRicevutaDialog
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
          ricevuta={deleting}
        />
      </TableCell>
    </TableRow>
  )
}

export default function ServiziPage() {
  const { banda } = useBanda()
  const canWrite = usePermission("servizi:write")
  const [page, setPage] = useState(1)
  const [yearFilter, setYearFilter] = useState<string>(ALL_YEARS)
  const anno = yearFilter === ALL_YEARS ? undefined : Number(yearFilter)
  const { data, isLoading, isError } = useServizi(page, PAGE_SIZE, banda!.codice, anno, !!banda)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Servizio | null>(null)
  const [deleting, setDeleting] = useState<Servizio | null>(null)
  // Only one servizio's ricevute panel is expanded at a time.
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const toggleExpanded = (id: number) => setExpandedId((current) => (current === id ? null : id))

  const servizi = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1
  const colCount = canWrite ? 8 : 7

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (servizio: Servizio) => {
    setEditing(servizio)
    setFormOpen(true)
  }

  const handleYearChange = (value: string) => {
    setYearFilter(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Servizi</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo servizio
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="anno-filter" className="text-sm text-muted-foreground">
          Anno
        </Label>
        <Select value={yearFilter} onValueChange={handleYearChange}>
          <SelectTrigger id="anno-filter" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_YEARS}>Tutti gli anni</SelectItem>
            {YEAR_OPTIONS.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
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
                <TableHead className="w-10" />
                <TableHead>Descrizione</TableHead>
                <TableHead>Anno</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Indirizzo</TableHead>
                <TableHead>Committente</TableHead>
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
                    Errore nel caricamento dei servizi.
                  </TableCell>
                </TableRow>
              ) : servizi.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">
                    Nessun servizio trovato
                  </TableCell>
                </TableRow>
              ) : (
                servizi.map((servizio) => {
                  const expanded = expandedId === servizio.id
                  return (
                    <Fragment key={servizio.id}>
                      <TableRow>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpanded(servizio.id)}
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
                          {servizio.descrizione_servizio}
                        </TableCell>
                        <TableCell>{servizio.anno}</TableCell>
                        <TableCell>{formatDataServizio(servizio.data_servizio)}</TableCell>
                        <TableCell>{formatIndirizzoServizio(servizio.indirizzo)}</TableCell>
                        <TableCell>{servizio.committente?.denominazione ?? "—"}</TableCell>
                        <TableCell>{formatNote(servizio.note)}</TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(servizio)}
                                aria-label="Modifica"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleting(servizio)}
                                aria-label="Elimina"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {expanded && (
                        <ServizioRicevutePanel servizioId={servizio.id} colSpan={colCount} />
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

      <ServizioFormDialog open={formOpen} onOpenChange={setFormOpen} servizio={editing} />
      <DeleteServizioDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        servizio={deleting}
      />
    </div>
  )
}
