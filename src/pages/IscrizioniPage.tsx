import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useIscrizioni, useLookupStatiIscrizione } from "@/hooks/useIscrizioni"
import { useSoci } from "@/hooks/useSoci"
import { usePermission } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import type { Iscrizione } from "@/types/iscrizione"
import type { Socio } from "@/types/socio"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import IscrizioneFormDialog from "@/components/iscrizioni/IscrizioneFormDialog"
import DeleteIscrizioneDialog from "@/components/iscrizioni/DeleteIscrizioneDialog"

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

/** Formats an ISO date string ("YYYY-MM-DD") as "DD/MM/YYYY". */
function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function formatQuota(quota: number): string {
  return `€ ${quota.toFixed(2)}`
}

function formatNote(note: string | null): string {
  if (!note) return "—"
  return note.length > 50 ? `${note.slice(0, 50)}…` : note
}

/** Tailwind classes for each stato badge, keyed by descrizione. */
function statoBadgeClass(descrizione: string): string {
  switch (descrizione) {
    case "Pagata":
      return "border-transparent bg-green-100 text-green-800"
    case "Da pagare":
      return "border-transparent bg-yellow-100 text-yellow-800"
    case "Annullata":
      return "border-transparent bg-gray-100 text-gray-700"
    default:
      return ""
  }
}

function socioFullName(socio: Socio | undefined): string {
  if (!socio) return "—"
  return `${socio.persona?.nome ?? ""} ${socio.persona?.cognome ?? ""}`.trim() || "—"
}

export default function IscrizioniPage() {
  const { banda } = useBanda()
  const canWrite = usePermission("iscrizioni:write")
  const [page, setPage] = useState(1)
  const [yearFilter, setYearFilter] = useState<string>(String(CURRENT_YEAR))
  const anno = yearFilter === ALL_YEARS ? undefined : Number(yearFilter)

  const { data, isLoading, isError } = useIscrizioni(page, PAGE_SIZE, undefined, anno)

  // Soci are scoped to the banda and used to resolve socio names for display.
  const sociQuery = useSoci(1, 100, banda!.codice, !!banda)
  const sociById = useMemo(() => {
    const map = new Map<number, Socio>()
    for (const socio of sociQuery.data?.items ?? []) map.set(socio.id, socio)
    return map
  }, [sociQuery.data])

  const statiQuery = useLookupStatiIscrizione()
  const statoById = useMemo(() => {
    const map = new Map<number, string>()
    for (const stato of statiQuery.data ?? []) map.set(stato.codice, stato.descrizione)
    return map
  }, [statiQuery.data])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Iscrizione | null>(null)
  const [deleting, setDeleting] = useState<Iscrizione | null>(null)

  const iscrizioni = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1
  const colCount = canWrite ? 7 : 6

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (iscrizione: Iscrizione) => {
    setEditing(iscrizione)
    setFormOpen(true)
  }

  const handleYearChange = (value: string) => {
    setYearFilter(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Iscrizioni</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova iscrizione
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Socio</TableHead>
              <TableHead>Anno</TableHead>
              <TableHead>Data iscrizione</TableHead>
              <TableHead>Quota</TableHead>
              <TableHead>Stato</TableHead>
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
                  Errore nel caricamento delle iscrizioni.
                </TableCell>
              </TableRow>
            ) : iscrizioni.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">
                  Nessuna iscrizione trovata
                </TableCell>
              </TableRow>
            ) : (
              iscrizioni.map((iscrizione) => {
                const descrizione = statoById.get(iscrizione.stato_iscrizione_codice)
                return (
                  <TableRow key={iscrizione.id}>
                    <TableCell className="font-medium">
                      {socioFullName(sociById.get(iscrizione.socio_id))}
                    </TableCell>
                    <TableCell>{iscrizione.anno}</TableCell>
                    <TableCell>{formatDate(iscrizione.data_iscrizione)}</TableCell>
                    <TableCell>{formatQuota(iscrizione.quota_partecipazione)}</TableCell>
                    <TableCell>
                      {descrizione ? (
                        <Badge variant="outline" className={statoBadgeClass(descrizione)}>
                          {descrizione}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{formatNote(iscrizione.note)}</TableCell>
                    {canWrite && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(iscrizione)}
                            aria-label="Modifica"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(iscrizione)}
                            aria-label="Elimina"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
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

      <IscrizioneFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        iscrizione={editing}
        socioName={editing ? socioFullName(sociById.get(editing.socio_id)) : undefined}
      />
      <DeleteIscrizioneDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        iscrizione={deleting}
        socioName={deleting ? socioFullName(sociById.get(deleting.socio_id)) : undefined}
      />
    </div>
  )
}
