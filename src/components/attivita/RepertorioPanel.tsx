import { useState } from "react"
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import {
  REPERTORIO_KEY,
  useRepertorio,
  useUpdateRepertorioItem,
  type RepertorioContainer,
} from "@/hooks/useRepertorio"
import { usePermission } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import type { RepertorioItem } from "@/types/repertorio"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import AddBranoRepertorioDialog from "@/components/attivita/AddBranoRepertorioDialog"
import DeleteRepertorioItemDialog from "@/components/attivita/DeleteRepertorioItemDialog"

function formatNote(note: string | null): string {
  if (!note) return "—"
  return note.length > 50 ? `${note.slice(0, 50)}…` : note
}

interface RepertorioPanelProps {
  container: RepertorioContainer
  colSpan: number
}

/** Inline sub-row listing the repertorio (brani in programma) of a single servizio o prova. */
export default function RepertorioPanel({ container, colSpan }: RepertorioPanelProps) {
  const { data, isLoading, isError } = useRepertorio(container)
  const canWrite = usePermission("servizi:write")
  const updateRepertorioItem = useUpdateRepertorioItem()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState<RepertorioItem | null>(null)
  const [swapping, setSwapping] = useState(false)

  const repertorio = [...(data?.items ?? [])].sort((a, b) => a.ordine - b.ordine)
  const repertorioColCount = canWrite ? 4 : 3
  const existingNomeParteIds = repertorio.map((r) => r.nome_parte_id)
  const nextOrdine = repertorio.length > 0 ? Math.max(...repertorio.map((r) => r.ordine)) + 1 : 1

  const handleNoteBlur = (item: RepertorioItem, value: string) => {
    const note = value.trim() || null
    if (note === item.note) return
    updateRepertorioItem.mutate({ id: item.id, input: { note } })
  }

  const handleSwap = async (item: RepertorioItem, other: RepertorioItem) => {
    if (item.ordine === other.ordine) return
    setSwapping(true)
    try {
      await updateRepertorioItem.mutateAsync({ id: item.id, input: { ordine: other.ordine } })
      try {
        await updateRepertorioItem.mutateAsync({ id: other.id, input: { ordine: item.ordine } })
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Riordino non riuscito",
          description: `Lo scambio non è stato completato: ${getErrorMessage(err)}. L'ordine mostrato è stato ricaricato dal server.`,
        })
        queryClient.invalidateQueries({ queryKey: REPERTORIO_KEY })
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    } finally {
      setSwapping(false)
    }
  }

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="bg-muted/30 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Repertorio</h3>
              {!isLoading && !isError && (
                <p className="text-xs text-muted-foreground">
                  {repertorio.length === 0
                    ? "Nessun brano nel repertorio"
                    : `${repertorio.length} brani in programma`}
                </p>
              )}
            </div>
            {canWrite && (
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi brano
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Ordine</TableHead>
                    <TableHead>Brano</TableHead>
                    <TableHead>Note</TableHead>
                    {canWrite && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: repertorioColCount }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={repertorioColCount}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Errore nel caricamento del repertorio.
                      </TableCell>
                    </TableRow>
                  ) : repertorio.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={repertorioColCount}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nessun brano nel repertorio
                      </TableCell>
                    </TableRow>
                  ) : (
                    repertorio.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.ordine}</TableCell>
                        <TableCell>{item.nome_parte?.nome ?? "—"}</TableCell>
                        <TableCell>
                          {canWrite ? (
                            <Input
                              key={`${item.id}-${item.note ?? ""}`}
                              className="h-8 w-40"
                              defaultValue={item.note ?? ""}
                              onBlur={(e) => handleNoteBlur(item, e.target.value)}
                            />
                          ) : (
                            formatNote(item.note)
                          )}
                        </TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSwap(item, repertorio[index - 1])}
                                disabled={index === 0 || swapping}
                                aria-label="Sposta su"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSwap(item, repertorio[index + 1])}
                                disabled={index === repertorio.length - 1 || swapping}
                                aria-label="Sposta giù"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleting(item)}
                                disabled={swapping}
                                aria-label="Rimuovi"
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
        </div>

        <AddBranoRepertorioDialog
          container={container}
          nextOrdine={nextOrdine}
          open={addOpen}
          onOpenChange={setAddOpen}
          existingNomeParteIds={existingNomeParteIds}
        />
        <DeleteRepertorioItemDialog
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
          item={deleting}
        />
      </TableCell>
    </TableRow>
  )
}
