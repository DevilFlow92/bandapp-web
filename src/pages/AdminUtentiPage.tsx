import { useState } from "react"
import { ChevronLeft, ChevronRight, KeyRound, Pencil, Plus, Trash2 } from "lucide-react"
import { useUtenti } from "@/hooks/useAdmin"
import type { Utente } from "@/types/admin"
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
import UtenteFormDialog from "@/components/admin/UtenteFormDialog"
import SetPasswordDialog from "@/components/admin/SetPasswordDialog"
import DeleteUtenteDialog from "@/components/admin/DeleteUtenteDialog"

const PAGE_SIZE = 20

export default function AdminUtentiPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useUtenti(page, PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Utente | null>(null)
  const [passwordFor, setPasswordFor] = useState<Utente | null>(null)
  const [deleting, setDeleting] = useState<Utente | null>(null)

  const utenti = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (utente: Utente) => {
    setEditing(utente)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Utenti</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo utente
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Superuser</TableHead>
              <TableHead>Ruoli</TableHead>
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
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Errore nel caricamento degli utenti.
                </TableCell>
              </TableRow>
            ) : utenti.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Nessun utente trovato
                </TableCell>
              </TableRow>
            ) : (
              utenti.map((utente) => (
                <TableRow key={utente.id}>
                  <TableCell className="font-medium">{utente.email}</TableCell>
                  <TableCell>{utente.nome_completo ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {utente.tipo === "umano" ? "Umano" : "Servizio"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={utente.attivo ? "default" : "outline"}>
                      {utente.attivo ? "Attivo" : "Inattivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {utente.superuser ? (
                      <span aria-label="Sì">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {utente.ruoli.length > 0 ? utente.ruoli.map((r) => r.nome).join(", ") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPasswordFor(utente)}
                        aria-label="Cambia password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(utente)}
                        aria-label="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(utente)}
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

      <UtenteFormDialog open={formOpen} onOpenChange={setFormOpen} utente={editing} />
      <SetPasswordDialog
        open={passwordFor !== null}
        onOpenChange={(open) => {
          if (!open) setPasswordFor(null)
        }}
        utente={passwordFor}
      />
      <DeleteUtenteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        utente={deleting}
      />
    </div>
  )
}
