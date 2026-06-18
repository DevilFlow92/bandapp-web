import { useState } from "react"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useServizi } from "@/hooks/useServizi"
import { useBanda } from "@/context/BandaContext"
import type { Servizio } from "@/types/servizio"
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
  formatIndirizzo,
} from "@/components/servizi/ServizioFormDialog"
import DeleteServizioDialog from "@/components/servizi/DeleteServizioDialog"

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

export default function ServiziPage() {
  const { banda } = useBanda()
  const [page, setPage] = useState(1)
  const [yearFilter, setYearFilter] = useState<string>(ALL_YEARS)
  const anno = yearFilter === ALL_YEARS ? undefined : Number(yearFilter)
  const { data, isLoading, isError } = useServizi(
    page,
    PAGE_SIZE,
    banda!.codice,
    anno,
    !!banda
  )

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Servizio | null>(null)
  const [deleting, setDeleting] = useState<Servizio | null>(null)

  const servizi = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1

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
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo servizio
        </Button>
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
              <TableHead>Descrizione</TableHead>
              <TableHead>Anno</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Indirizzo</TableHead>
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
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  Errore nel caricamento dei servizi.
                </TableCell>
              </TableRow>
            ) : servizi.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  Nessun servizio trovato
                </TableCell>
              </TableRow>
            ) : (
              servizi.map((servizio) => (
                <TableRow key={servizio.id}>
                  <TableCell className="font-medium">
                    {servizio.descrizione_servizio}
                  </TableCell>
                  <TableCell>{servizio.anno}</TableCell>
                  <TableCell>
                    {formatDataServizio(servizio.data_servizio)}
                  </TableCell>
                  <TableCell>
                    {servizio.indirizzo
                      ? formatIndirizzo(servizio.indirizzo)
                      : servizio.indirizzo_id}
                  </TableCell>
                  <TableCell>{formatNote(servizio.note)}</TableCell>
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
                </TableRow>
              ))
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

      <ServizioFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        servizio={editing}
      />
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
