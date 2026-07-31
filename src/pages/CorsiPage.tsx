import { Fragment, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useCorsi, useLookupTipiCorso } from "@/hooks/useCorsi"
import { usePermission } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import type { Corso } from "@/types/corso"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import CorsoFormDialog from "@/components/corsi/CorsoFormDialog"
import DeleteCorsoDialog from "@/components/corsi/DeleteCorsoDialog"
import LezioniPanel from "@/components/corsi/LezioniPanel"
import IscrizioniPanel from "@/components/corsi/IscrizioniPanel"

const PAGE_SIZE = 20

function formatNome(nome: string | null | undefined): string {
  if (!nome) return "—"
  return nome.length > 30 ? `${nome.slice(0, 30)}…` : nome
}

export default function CorsiPage() {
  const { banda } = useBanda()
  const canWrite = usePermission("corsi:write")
  const [page, setPage] = useState(1)
  const [filterTipoCorsoCodice, setFilterTipoCorsoCodice] = useState<number | undefined>(undefined)

  const { data, isLoading, isError } = useCorsi(
    page,
    PAGE_SIZE,
    banda!.codice,
    undefined,
    filterTipoCorsoCodice,
    !!banda,
  )
  const { data: tipiCorso } = useLookupTipiCorso()

  const [editing, setEditing] = useState<Corso | null>(null)
  const [deleting, setDeleting] = useState<Corso | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const toggleExpanded = (id: number) => setExpandedId((current) => (current === id ? null : id))

  const corsi = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1
  const colCount = canWrite ? 7 : 6

  const openEdit = (corso: Corso) => {
    setEditing(corso)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Corsi</h1>
        {canWrite && (
          <Button onClick={() => setEditing({} as Corso)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo corso
          </Button>
        )}
      </div>

      <div className="max-w-sm">
        <Select
          value={filterTipoCorsoCodice?.toString() ?? ""}
          onValueChange={(value) => {
            setFilterTipoCorsoCodice(value ? parseInt(value, 10) : undefined)
            setPage(1)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filtra per tipo corso…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutti i corsi</SelectItem>
            {(tipiCorso ?? []).map((tipo) => (
              <SelectItem key={tipo.codice} value={tipo.codice.toString()}>
                {tipo.descrizione}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Tipo corso</TableHead>
                <TableHead>Anno</TableHead>
                <TableHead>Coordinatore</TableHead>
                <TableHead>Insegnante</TableHead>
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
                    Errore nel caricamento dei corsi.
                  </TableCell>
                </TableRow>
              ) : corsi.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">
                    Nessun corso trovato
                  </TableCell>
                </TableRow>
              ) : (
                corsi.map((corso) => {
                  const expanded = expandedId === corso.id
                  const coordinatoreLabel = corso.coordinatore
                    ? `${corso.coordinatore.nome} ${corso.coordinatore.cognome}`.trim()
                    : "—"
                  const insegnanteLabel = corso.insegnante
                    ? `${corso.insegnante.nome} ${corso.insegnante.cognome}`.trim()
                    : "—"

                  return (
                    <Fragment key={corso.id}>
                      <TableRow>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpanded(corso.id)}
                            aria-label={expanded ? "Comprimi" : "Espandi"}
                            aria-expanded={expanded}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {corso.tipo_corso?.descrizione ?? "—"}
                        </TableCell>
                        <TableCell>{corso.anno}</TableCell>
                        <TableCell>{formatNome(coordinatoreLabel)}</TableCell>
                        <TableCell>{formatNome(insegnanteLabel)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatNome(corso.note)}
                        </TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(corso)}
                                aria-label="Modifica"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleting(corso)}
                                aria-label="Elimina"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {expanded && (
                        <>
                          <LezioniPanel corsoId={corso.id} colSpan={colCount} />
                          <IscrizioniPanel corsoId={corso.id} colSpan={colCount} />
                        </>
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

      <CorsoFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        corso={editing && Object.keys(editing).length > 0 ? editing : undefined}
      />
      <DeleteCorsoDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        corso={deleting}
      />
    </div>
  )
}
