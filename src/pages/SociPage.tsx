import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useSoci } from "@/hooks/useSoci"
import { useIscrizioni } from "@/hooks/useIscrizioni"
import { useBanda } from "@/context/BandaContext"
import type { Socio } from "@/types/socio"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import SocioFormDialog from "@/components/soci/SocioFormDialog"
import DeleteSocioDialog from "@/components/soci/DeleteSocioDialog"

const PAGE_SIZE = 20
const CURRENT_YEAR = new Date().getFullYear()
/** Stato "Annullata" — these iscrizioni do not count towards an active socio. */
const STATO_ANNULLATA = 3

export default function SociPage() {
  const navigate = useNavigate()
  const { banda } = useBanda()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useSoci(
    page,
    PAGE_SIZE,
    banda!.codice,
    !!banda
  )
  // A socio is "active" when they have a non-cancelled iscrizione for the
  // current year. Iscrizioni are scoped to the banda via their soci.
  const { data: iscrizioniData } = useIscrizioni(1, 100, undefined, CURRENT_YEAR)
  const activeSocioIds = useMemo(() => {
    const set = new Set<number>()
    for (const iscrizione of iscrizioniData?.items ?? []) {
      if (iscrizione.stato_iscrizione_codice !== STATO_ANNULLATA) {
        set.add(iscrizione.socio_id)
      }
    }
    return set
  }, [iscrizioniData])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Socio | null>(null)
  const [deleting, setDeleting] = useState<Socio | null>(null)

  const soci = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (socio: Socio) => {
    setEditing(socio)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Soci</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo socio
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cognome</TableHead>
              <TableHead>Codice Socio</TableHead>
              <TableHead>Strumento</TableHead>
              <TableHead>Ruolo Banda</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  Errore nel caricamento dei soci.
                </TableCell>
              </TableRow>
            ) : soci.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  Nessun socio trovato
                </TableCell>
              </TableRow>
            ) : (
              soci.map((socio) => (
                <TableRow
                  key={socio.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/soci/${socio.id}`)}
                >
                  <TableCell>{socio.persona?.nome ?? "—"}</TableCell>
                  <TableCell>{socio.persona?.cognome ?? "—"}</TableCell>
                  <TableCell>{socio.codice_socio}</TableCell>
                  <TableCell>{socio.strumento?.descrizione ?? "—"}</TableCell>
                  <TableCell>{socio.ruolo_banda?.descrizione ?? "—"}</TableCell>
                  <TableCell>
                    {activeSocioIds.has(socio.id) ? (
                      <Badge
                        variant="outline"
                        className="border-transparent bg-green-100 text-green-800"
                      >
                        Attivo
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-transparent bg-gray-100 text-gray-700"
                      >
                        Inattivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(socio)}
                        aria-label="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(socio)}
                        aria-label="Rimuovi"
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

      <SocioFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        socio={editing}
      />
      <DeleteSocioDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        socio={deleting}
      />
    </div>
  )
}
