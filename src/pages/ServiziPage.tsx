import { Fragment, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useServizi } from "@/hooks/useServizi"
import { useRicevute } from "@/hooks/useRicevute"
import { useOrganicoServizio, useUpdatePresenza } from "@/hooks/usePresenze"
import { usePermission } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import type { Servizio } from "@/types/servizio"
import type { Ricevuta } from "@/types/ricevuta"
import type { Presenza, StatoPresenza } from "@/types/presenza"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import AddPersonaOrganicoDialog from "@/components/servizi/AddPersonaOrganicoDialog"
import DeletePresenzaDialog from "@/components/servizi/DeletePresenzaDialog"

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

const STATO_LABELS: Record<string, string> = {
  NONE: "Da registrare",
  PRESENTE: "Presente",
  ASSENTE: "Assente",
  GIUSTIFICATO: "Giustificato",
}

/** Tailwind classes for the stato badge, mirroring the statoBadgeClass pattern used for Iscrizione. */
function statoPresenzaBadgeClass(stato: StatoPresenza | null): string {
  switch (stato) {
    case "PRESENTE":
      return "border-transparent bg-green-100 text-green-800"
    case "ASSENTE":
      return "border-transparent bg-red-100 text-red-800"
    case "GIUSTIFICATO":
      return "border-transparent bg-yellow-100 text-yellow-800"
    default:
      return "border-transparent bg-gray-100 text-gray-700"
  }
}

function personaInPresenzaLabel(presenza: Presenza): string {
  const { nome, cognome, ragione_sociale } = presenza.persona ?? {}
  return ragione_sociale || `${nome ?? ""} ${cognome ?? ""}`.trim() || "—"
}

/** Inline sub-row listing the organico (presenze) of a single servizio. */
function ServizioOrganicoPanel({ servizioId, colSpan }: { servizioId: number; colSpan: number }) {
  const { data, isLoading, isError } = useOrganicoServizio(servizioId)
  const canWrite = usePermission("servizi:write")
  const updatePresenza = useUpdatePresenza()
  const [addTipo, setAddTipo] = useState<"socio" | "esterno" | null>(null)
  const [deleting, setDeleting] = useState<Presenza | null>(null)

  const organico = data?.items ?? []
  const organicoColCount = canWrite ? 4 : 3
  const existingPersonaIds = organico.map((p) => p.persona_id)

  const presentiCount = organico.filter((p) => p.stato === "PRESENTE").length
  const assentiCount = organico.filter((p) => p.stato === "ASSENTE").length
  const giustificatiCount = organico.filter((p) => p.stato === "GIUSTIFICATO").length
  const daRegistrareCount = organico.length - presentiCount - assentiCount - giustificatiCount

  const handleStatoChange = (presenza: Presenza, value: string) => {
    const stato = value === "NONE" ? null : (value as StatoPresenza)
    if (stato === presenza.stato) return
    updatePresenza.mutate({ id: presenza.id, input: { stato } })
  }

  const handleNoteBlur = (presenza: Presenza, value: string) => {
    const note = value.trim() || null
    if (note === presenza.note) return
    updatePresenza.mutate({ id: presenza.id, input: { note } })
  }

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="bg-muted/30 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Organico</h3>
              {!isLoading && !isError && (
                <p className="text-xs text-muted-foreground">
                  {organico.length === 0
                    ? "Nessuna persona in organico"
                    : `${presentiCount} presenti, ${assentiCount} assenti, ${giustificatiCount} giustificati, ${daRegistrareCount} da registrare su ${organico.length} totali`}
                </p>
              )}
            </div>
            {canWrite && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => setAddTipo("socio")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi socio
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAddTipo("esterno")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi esterno
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Note</TableHead>
                    {canWrite && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: organicoColCount }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={organicoColCount}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Errore nel caricamento dell'organico.
                      </TableCell>
                    </TableRow>
                  ) : organico.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={organicoColCount}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nessuna persona in organico
                      </TableCell>
                    </TableRow>
                  ) : (
                    organico.map((presenza) => (
                      <TableRow key={presenza.id}>
                        <TableCell>{personaInPresenzaLabel(presenza)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={statoPresenzaBadgeClass(presenza.stato)}
                            >
                              {STATO_LABELS[presenza.stato ?? "NONE"]}
                            </Badge>
                            {canWrite && (
                              <Select
                                value={presenza.stato ?? "NONE"}
                                onValueChange={(value) => handleStatoChange(presenza, value)}
                              >
                                <SelectTrigger className="h-8 w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">Da registrare</SelectItem>
                                  <SelectItem value="PRESENTE">Presente</SelectItem>
                                  <SelectItem value="ASSENTE">Assente</SelectItem>
                                  <SelectItem value="GIUSTIFICATO">Giustificato</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {canWrite ? (
                            <Input
                              key={`${presenza.id}-${presenza.note ?? ""}`}
                              className="h-8 w-40"
                              defaultValue={presenza.note ?? ""}
                              onBlur={(e) => handleNoteBlur(presenza, e.target.value)}
                            />
                          ) : (
                            formatNote(presenza.note)
                          )}
                        </TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleting(presenza)}
                              aria-label="Rimuovi"
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

        <AddPersonaOrganicoDialog
          servizioId={servizioId}
          tipo={addTipo ?? "socio"}
          open={addTipo !== null}
          onOpenChange={(open) => {
            if (!open) setAddTipo(null)
          }}
          existingPersonaIds={existingPersonaIds}
        />
        <DeletePresenzaDialog
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
          presenza={deleting}
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
                        <>
                          <ServizioRicevutePanel servizioId={servizio.id} colSpan={colCount} />
                          <ServizioOrganicoPanel servizioId={servizio.id} colSpan={colCount} />
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
