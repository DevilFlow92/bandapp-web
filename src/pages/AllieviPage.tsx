import { Fragment, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useAllievi } from "@/hooks/useAllievi"
import { usePermission } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import type { Allievo } from "@/types/allievo"
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
import AllievoFormDialog from "@/components/allievi/AllievoFormDialog"
import DeleteAllievoDialog from "@/components/allievi/DeleteAllievoDialog"
import IndirizziSection from "@/components/anagrafica/IndirizziSection"
import ContattiSection from "@/components/anagrafica/ContattiSection"

const PAGE_SIZE = 20

export default function AllieviPage() {
  const navigate = useNavigate()
  const { banda } = useBanda()
  const canWrite = usePermission("corsi:write")
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAllievi(page, PAGE_SIZE, banda!.codice, !!banda)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Allievo | null>(null)
  const [deleting, setDeleting] = useState<Allievo | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const allievi = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1
  const colCount = canWrite ? 4 : 3

  const openEdit = (allievo: Allievo) => {
    setEditing(allievo)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Allievi</h1>
        {canWrite && (
          <Button onClick={() => navigate("/allievi/nuovo")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo allievo
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Nome</TableHead>
                <TableHead>Cognome</TableHead>
                <TableHead>Codice Allievo</TableHead>
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
                    Errore nel caricamento degli allievi.
                  </TableCell>
                </TableRow>
              ) : allievi.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">
                    Nessun allievo trovato
                  </TableCell>
                </TableRow>
              ) : (
                allievi.map((allievo) => {
                  const isExpanded = expandedId === allievo.id
                  const toggleExpand = () =>
                    setExpandedId((prev) => (prev === allievo.id ? null : allievo.id))
                  return (
                    <Fragment key={allievo.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={toggleExpand}>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>{allievo.persona?.nome ?? "—"}</TableCell>
                        <TableCell>{allievo.persona?.cognome ?? "—"}</TableCell>
                        <TableCell>{allievo.codice_allievo}</TableCell>
                        {canWrite && (
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(allievo)}
                                aria-label="Modifica"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleting(allievo)}
                                aria-label="Rimuovi"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {isExpanded && typeof allievo.persona?.id === "number" && (
                        <TableRow>
                          <TableCell colSpan={colCount} className="bg-muted/30 p-0">
                            <div className="grid gap-6 lg:grid-cols-2 p-4">
                              <IndirizziSection
                                personaId={allievo.persona.id}
                                canWrite={canWrite}
                              />
                              <ContattiSection personaId={allievo.persona.id} canWrite={canWrite} />
                            </div>
                          </TableCell>
                        </TableRow>
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

      <AllievoFormDialog open={formOpen} onOpenChange={setFormOpen} allievo={editing} />
      <DeleteAllievoDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        allievo={deleting}
      />
    </div>
  )
}
