import { Fragment, useState } from "react"
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useIscrizioniCorsoByCorso } from "@/hooks/useIscrizioniCorso"
import { usePermission } from "@/hooks/useAuth"
import type { IscrizioneCorso } from "@/types/iscrizione_corso"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import IscrizioneCorsoFormDialog from "@/components/corsi/IscrizioneCorsoFormDialog"
import DeleteIscrizioneCorsoDialog from "@/components/corsi/DeleteIscrizioneCorsoDialog"
import PagamentiCorsoPanel from "@/components/corsi/PagamentiCorsoPanel"

interface IscrizioniPanelProps {
  corsoId: number
  colSpan: number
}

function formatDataIscrizione(iso: string): string {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function personaLabel(persona?: { nome?: string | null; cognome?: string | null }): string {
  const nome = persona?.nome ?? ""
  const cognome = persona?.cognome ?? ""
  return `${nome} ${cognome}`.trim() || "—"
}

function statoBadgeClass(stato?: { descrizione?: string }): string {
  const descrizione = stato?.descrizione ?? ""
  if (descrizione.includes("Confermata")) return "bg-green-100 text-green-800"
  if (descrizione.includes("Completata")) return "bg-blue-100 text-blue-800"
  if (descrizione.includes("Annullata")) return "bg-red-100 text-red-800"
  if (descrizione.includes("Richiesta")) return "bg-yellow-100 text-yellow-800"
  return "bg-gray-100 text-gray-700"
}

export default function IscrizioniPanel({ corsoId, colSpan }: IscrizioniPanelProps) {
  const canWrite = usePermission("corsi:write")
  const { data, isLoading } = useIscrizioniCorsoByCorso(corsoId, 1, 100, !!corsoId)
  const iscrizioni = data?.items ?? []

  const [editing, setEditing] = useState<IscrizioneCorso | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<IscrizioneCorso | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const toggleExpanded = (id: number) => setExpandedId((current) => (current === id ? null : id))

  const innerColCount = canWrite ? 5 : 4

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="px-4 py-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Elenco iscritti</h4>
            {canWrite && (
              <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuova iscrizione
              </Button>
            )}
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Alunno</TableHead>
                  <TableHead>Stato iscrizione</TableHead>
                  <TableHead>Data iscrizione</TableHead>
                  <TableHead>Note</TableHead>
                  {canWrite && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: innerColCount }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : iscrizioni.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={innerColCount}
                      className="py-4 text-center text-muted-foreground"
                    >
                      Nessun iscritto
                    </TableCell>
                  </TableRow>
                ) : (
                  iscrizioni.map((iscrizione) => {
                    const expanded = expandedId === iscrizione.id
                    return (
                      <Fragment key={iscrizione.id}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpanded(iscrizione.id)}
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
                          <TableCell>{personaLabel(iscrizione.persona)}</TableCell>
                          <TableCell>
                            <Badge className={statoBadgeClass(iscrizione.stato_iscrizione_corso)}>
                              {iscrizione.stato_iscrizione_corso?.descrizione ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDataIscrizione(iscrizione.data_iscrizione)}</TableCell>
                          <TableCell>{iscrizione.note ?? "—"}</TableCell>
                          {canWrite && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setEditing(iscrizione)}
                                  aria-label="Modifica"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setDeleting(iscrizione)}
                                  aria-label="Elimina"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                        {expanded && (
                          <PagamentiCorsoPanel
                            iscrizioneCorsoId={iscrizione.id}
                            colSpan={innerColCount}
                          />
                        )}
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <IscrizioneCorsoFormDialog open={creating} onOpenChange={setCreating} corsoId={corsoId} />
        <IscrizioneCorsoFormDialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          corsoId={corsoId}
          iscrizione={editing}
        />
        <DeleteIscrizioneCorsoDialog
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
          iscrizione={deleting}
        />
      </TableCell>
    </TableRow>
  )
}
