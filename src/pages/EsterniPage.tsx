import { useState } from "react"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useEsterni } from "@/hooks/useEsterni"
import { useBanda } from "@/context/BandaContext"
import type { Esterno } from "@/types/esterno"
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
import EsternoFormDialog from "@/components/esterni/EsternoFormDialog"
import DeleteEsternoDialog from "@/components/esterni/DeleteEsternoDialog"

const PAGE_SIZE = 20

export default function EsterniPage() {
  const { banda } = useBanda()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useEsterni(page, PAGE_SIZE, banda!.codice, !!banda)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Esterno | null>(null)
  const [deleting, setDeleting] = useState<Esterno | null>(null)

  const esterni = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (esterno: Esterno) => {
    setEditing(esterno)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Esterni</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo esterno
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cognome</TableHead>
              <TableHead>Codice Esterno</TableHead>
              <TableHead>Strumento</TableHead>
              <TableHead>Stato</TableHead>
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
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Errore nel caricamento degli esterni.
                </TableCell>
              </TableRow>
            ) : esterni.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Nessun esterno trovato
                </TableCell>
              </TableRow>
            ) : (
              esterni.map((esterno) => (
                <TableRow key={esterno.id}>
                  <TableCell>{esterno.persona?.nome ?? "—"}</TableCell>
                  <TableCell>{esterno.persona?.cognome ?? "—"}</TableCell>
                  <TableCell>{esterno.codice_esterno}</TableCell>
                  <TableCell>{esterno.strumento?.descrizione ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={esterno.attivo ? "default" : "secondary"}>
                      {esterno.attivo ? "Attivo" : "Inattivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(esterno)}
                        aria-label="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(esterno)}
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

      <EsternoFormDialog open={formOpen} onOpenChange={setFormOpen} esterno={editing} />
      <DeleteEsternoDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        esterno={deleting}
      />
    </div>
  )
}
