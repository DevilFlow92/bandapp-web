import { useState } from "react"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useLookupTipiSpartito, useSpartiti } from "@/hooks/useSpartiti"
import { useLookupStrumenti } from "@/hooks/useSoci"
import { useBanda } from "@/context/BandaContext"
import type { Spartito } from "@/types/spartito"
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
import SpartitoFormDialog from "@/components/spartiti/SpartitoFormDialog"
import DeleteSpartitoDialog from "@/components/spartiti/DeleteSpartitoDialog"

const PAGE_SIZE = 20
const ALL = "all"

function formatPosizione(spartito: Spartito): string {
  const parts = [spartito.scaffale, spartito.ripiano, spartito.cartella].filter(
    Boolean
  )
  return parts.length > 0 ? parts.join(" › ") : "—"
}

export default function SpartitiPage() {
  const { banda } = useBanda()
  const [page, setPage] = useState(1)
  const [tipoFilter, setTipoFilter] = useState<string>(ALL)
  const [strumentoFilter, setStrumentoFilter] = useState<string>(ALL)

  const tipoSpartitoCode = tipoFilter === ALL ? undefined : Number(tipoFilter)
  const strumentoCode =
    strumentoFilter === ALL ? undefined : Number(strumentoFilter)

  const { data, isLoading, isError } = useSpartiti(
    page,
    PAGE_SIZE,
    banda!.codice,
    tipoSpartitoCode,
    strumentoCode,
    !!banda
  )
  const tipiSpartito = useLookupTipiSpartito()
  const strumenti = useLookupStrumenti()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Spartito | null>(null)
  const [deleting, setDeleting] = useState<Spartito | null>(null)

  const spartiti = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (spartito: Spartito) => {
    setEditing(spartito)
    setFormOpen(true)
  }

  const handleTipoChange = (value: string) => {
    setTipoFilter(value)
    setPage(1)
  }

  const handleStrumentoChange = (value: string) => {
    setStrumentoFilter(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Spartiti</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo spartito
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="tipo-filter" className="text-sm text-muted-foreground">
            Tipo spartito
          </Label>
          <Select value={tipoFilter} onValueChange={handleTipoChange}>
            <SelectTrigger id="tipo-filter" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti</SelectItem>
              {tipiSpartito.data?.map((t) => (
                <SelectItem key={t.codice} value={String(t.codice)}>
                  {t.descrizione}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="strumento-filter"
            className="text-sm text-muted-foreground"
          >
            Strumento
          </Label>
          <Select value={strumentoFilter} onValueChange={handleStrumentoChange}>
            <SelectTrigger id="strumento-filter" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti</SelectItem>
              {strumenti.data?.map((s) => (
                <SelectItem key={s.codice} value={String(s.codice)}>
                  {s.descrizione}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titolo</TableHead>
              <TableHead>Autore</TableHead>
              <TableHead>Anno</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Strumento</TableHead>
              <TableHead>Posizione</TableHead>
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
                  Errore nel caricamento degli spartiti.
                </TableCell>
              </TableRow>
            ) : spartiti.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  Nessuno spartito trovato
                </TableCell>
              </TableRow>
            ) : (
              spartiti.map((spartito) => (
                <TableRow key={spartito.id}>
                  <TableCell className="font-medium">
                    {spartito.titolo}
                  </TableCell>
                  <TableCell>{spartito.autore ?? "—"}</TableCell>
                  <TableCell>{spartito.anno ?? "—"}</TableCell>
                  <TableCell>{spartito.tipo_spartito.descrizione}</TableCell>
                  <TableCell>
                    {spartito.strumento
                      ? spartito.strumento.descrizione
                      : "Partitura completa"}
                  </TableCell>
                  <TableCell>{formatPosizione(spartito)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(spartito)}
                        aria-label="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(spartito)}
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

      <SpartitoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        spartito={editing}
      />
      <DeleteSpartitoDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        spartito={deleting}
      />
    </div>
  )
}
