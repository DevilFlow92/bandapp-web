import { useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useAllCommittenti } from "@/hooks/useCommittenti"
import { usePermission } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import type { Committente } from "@/types/committente"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import CommittenteFormDialog from "@/components/committenti/CommittenteFormDialog"
import DeleteCommittenteDialog from "@/components/committenti/DeleteCommittenteDialog"

const PAGE_SIZE = 20

/**
 * The /committenti API isn't documented to expose a text-search filter, so
 * this page loads the full committenti set for the banda (mirroring
 * useAllEsterni's full-fetch pattern) and searches/paginates client-side.
 */
export default function CommittentiPage() {
  const { banda } = useBanda()
  const canWrite = usePermission("servizi:write")
  const { data, isLoading, isError } = useAllCommittenti(banda?.codice ?? 0, !!banda)

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Committente | null>(null)
  const [deleting, setDeleting] = useState<Committente | null>(null)

  const filtered = useMemo(() => {
    const all = data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter((c) => c.denominazione.toLowerCase().includes(q))
  }, [data, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const committenti = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const colCount = canWrite ? 4 : 3

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (committente: Committente) => {
    setEditing(committente)
    setFormOpen(true)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Committenti</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo committente
          </Button>
        )}
      </div>

      <Input
        placeholder="Cerca per denominazione…"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-x-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Denominazione</TableHead>
                <TableHead>Codice fiscale / P.IVA</TableHead>
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
                    Errore nel caricamento dei committenti.
                  </TableCell>
                </TableRow>
              ) : committenti.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">
                    Nessun committente trovato
                  </TableCell>
                </TableRow>
              ) : (
                committenti.map((committente) => (
                  <TableRow key={committente.id}>
                    <TableCell className="font-medium">{committente.denominazione}</TableCell>
                    <TableCell>{committente.codice_fiscale_piva ?? "—"}</TableCell>
                    <TableCell>{committente.note ?? "—"}</TableCell>
                    {canWrite && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(committente)}
                            aria-label="Modifica"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(committente)}
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
          Pagina {currentPage} di {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || isLoading}
          >
            Precedente
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || isLoading}
          >
            Successiva
          </Button>
        </div>
      </div>

      <CommittenteFormDialog open={formOpen} onOpenChange={setFormOpen} committente={editing} />
      <DeleteCommittenteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        committente={deleting}
      />
    </div>
  )
}
