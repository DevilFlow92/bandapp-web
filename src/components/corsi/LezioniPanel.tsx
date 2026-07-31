import { Fragment, useState } from "react"
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useLezioniByCorso } from "@/hooks/useLezioni"
import { usePermission } from "@/hooks/useAuth"
import type { Lezione } from "@/types/lezione"
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
import LezioneFormDialog from "@/components/corsi/LezioneFormDialog"
import DeleteLezioneDialog from "@/components/corsi/DeleteLezioneDialog"
import RegistroPresenzePanel from "@/components/corsi/RegistroPresenzePanel"

interface LezioniPanelProps {
  corsoId: number
  colSpan: number
}

function formatDataLezione(iso: string): string {
  const [datePart, timePart = ""] = iso.split("T")
  const [year, month, day] = datePart.split("-")
  if (!year || !month || !day) return iso
  const time = timePart.slice(0, 5)
  return time ? `${day}/${month}/${year} ${time}` : `${day}/${month}/${year}`
}

export default function LezioniPanel({ corsoId, colSpan }: LezioniPanelProps) {
  const canWrite = usePermission("corsi:write")
  const { data, isLoading } = useLezioniByCorso(corsoId, 1, 100, !!corsoId)
  const lezioni = data?.items ?? []

  const [editing, setEditing] = useState<Lezione | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Lezione | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const toggleExpanded = (id: number) => setExpandedId((current) => (current === id ? null : id))

  const innerColCount = canWrite ? 4 : 3

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="px-4 py-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Calendario lezioni</h4>
            {canWrite && (
              <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuova lezione
              </Button>
            )}
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Data</TableHead>
                  <TableHead>Indirizzo</TableHead>
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
                ) : lezioni.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={innerColCount}
                      className="py-4 text-center text-muted-foreground"
                    >
                      Nessuna lezione
                    </TableCell>
                  </TableRow>
                ) : (
                  lezioni.map((lezione) => {
                    const expanded = expandedId === lezione.id
                    return (
                      <Fragment key={lezione.id}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpanded(lezione.id)}
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
                          <TableCell>{formatDataLezione(lezione.data_lezione)}</TableCell>
                          <TableCell>
                            {lezione.indirizzo ? (
                              <>
                                {lezione.indirizzo.prima_riga}
                                {lezione.indirizzo.numero_civico &&
                                  ` ${lezione.indirizzo.numero_civico}`}
                                {lezione.indirizzo.cap && `, ${lezione.indirizzo.cap}`}
                                {lezione.indirizzo.comune &&
                                  ` ${lezione.indirizzo.comune.descrizione}`}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{lezione.note ?? "—"}</TableCell>
                          {canWrite && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setEditing(lezione)}
                                  aria-label="Modifica"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setDeleting(lezione)}
                                  aria-label="Elimina"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                        {expanded && (
                          <RegistroPresenzePanel
                            corsoId={corsoId}
                            lezioneId={lezione.id}
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

        <LezioneFormDialog open={creating} onOpenChange={setCreating} corsoId={corsoId} />
        <LezioneFormDialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          corsoId={corsoId}
          lezione={editing}
        />
        <DeleteLezioneDialog
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
          lezione={deleting}
        />
      </TableCell>
    </TableRow>
  )
}
