import { useState } from "react"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useRuoli } from "@/hooks/useAdmin"
import { usePermission } from "@/hooks/useAuth"
import type { Ruolo } from "@/types/admin"
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
import RuoloFormDialog from "@/components/admin/RuoloFormDialog"
import DeleteRuoloDialog from "@/components/admin/DeleteRuoloDialog"

const PAGE_SIZE = 20

export default function AdminRuoliPage() {
  const canWrite = usePermission("ruoli:write")
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useRuoli(page, PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Ruolo | null>(null)
  const [deleting, setDeleting] = useState<Ruolo | null>(null)

  const ruoli = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1
  const colCount = canWrite ? 5 : 4

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (ruolo: Ruolo) => {
    setEditing(ruolo)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Ruoli</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo ruolo
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead>Banda</TableHead>
              <TableHead>Permessi</TableHead>
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
                  Errore nel caricamento dei ruoli.
                </TableCell>
              </TableRow>
            ) : ruoli.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">
                  Nessun ruolo trovato
                </TableCell>
              </TableRow>
            ) : (
              ruoli.map((ruolo) => (
                <TableRow key={ruolo.id}>
                  <TableCell className="font-medium">{ruolo.nome}</TableCell>
                  <TableCell>{ruolo.descrizione ?? "—"}</TableCell>
                  <TableCell>{ruolo.banda_codice ?? "Globale"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ruolo.permessi.length} permessi</Badge>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(ruolo)}
                          aria-label="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(ruolo)}
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

      <RuoloFormDialog open={formOpen} onOpenChange={setFormOpen} ruolo={editing} />
      <DeleteRuoloDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        ruolo={deleting}
      />
    </div>
  )
}
