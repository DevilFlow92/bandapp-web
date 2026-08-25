import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, UserCog, UserPlus } from "lucide-react"
import { useAllievi } from "@/hooks/useAllievi"
import { useAllUtenti } from "@/hooks/useAdmin"
import { usePermission } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import type { Allievo } from "@/types/allievo"
import type { Utente } from "@/types/admin"
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
import UtenteFormDialog from "@/components/admin/UtenteFormDialog"

const PAGE_SIZE = 20

export default function AllieviPage() {
  const navigate = useNavigate()
  const { banda } = useBanda()
  const canWrite = usePermission("corsi:write")
  const canManagePortalAccess = usePermission("utenti:write")
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAllievi(page, PAGE_SIZE, banda!.codice, !!banda)
  const utentiQuery = useAllUtenti(canManagePortalAccess)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Allievo | null>(null)
  const [deleting, setDeleting] = useState<Allievo | null>(null)

  const [portalFormOpen, setPortalFormOpen] = useState(false)
  const [portalUtente, setPortalUtente] = useState<Utente | null>(null)
  const [portalPreselect, setPortalPreselect] = useState<{
    personaId: number
    label: string
    tipo: "allievo"
  } | null>(null)

  const allievi = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1
  const showActionsColumn = canWrite || canManagePortalAccess
  const colCount = showActionsColumn ? 4 : 3

  const utentiByPersonaId = useMemo(() => {
    const map = new Map<number, Utente>()
    for (const utente of utentiQuery.data ?? []) {
      if (utente.persona_id != null) map.set(utente.persona_id, utente)
    }
    return map
  }, [utentiQuery.data])

  const openEdit = (allievo: Allievo) => {
    setEditing(allievo)
    setFormOpen(true)
  }

  const openPortalAccess = (allievo: Allievo) => {
    const existing = utentiByPersonaId.get(allievo.persona_id)
    if (existing) {
      setPortalUtente(existing)
      setPortalPreselect(null)
    } else {
      const nome = allievo.persona?.nome ?? ""
      const cognome = allievo.persona?.cognome ?? ""
      setPortalUtente(null)
      setPortalPreselect({
        personaId: allievo.persona_id,
        label: `${nome} ${cognome}`.trim() || allievo.codice_allievo,
        tipo: "allievo",
      })
    }
    setPortalFormOpen(true)
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
                <TableHead>Nome</TableHead>
                <TableHead>Cognome</TableHead>
                <TableHead>Codice Allievo</TableHead>
                {showActionsColumn && <TableHead className="text-right">Azioni</TableHead>}
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
                allievi.map((allievo) => (
                  <TableRow
                    key={allievo.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/allievi/${allievo.id}`)}
                  >
                    <TableCell>{allievo.persona?.nome ?? "—"}</TableCell>
                    <TableCell>{allievo.persona?.cognome ?? "—"}</TableCell>
                    <TableCell>{allievo.codice_allievo}</TableCell>
                    {showActionsColumn && (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {canManagePortalAccess &&
                            (utentiByPersonaId.has(allievo.persona_id) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPortalAccess(allievo)}
                                aria-label="Modifica accesso portale"
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPortalAccess(allievo)}
                                aria-label="Crea accesso portale"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            ))}
                          {canWrite && (
                            <>
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
                            </>
                          )}
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

      <AllievoFormDialog open={formOpen} onOpenChange={setFormOpen} allievo={editing} />
      <UtenteFormDialog
        open={portalFormOpen}
        onOpenChange={setPortalFormOpen}
        utente={portalUtente}
        personaPreselezionata={portalPreselect}
      />
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
