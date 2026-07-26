import { useState } from "react"
import { Download, Loader2, Plus, Trash2 } from "lucide-react"
import { useOrganico, useUpdatePresenza, type OrganicoContainer } from "@/hooks/usePresenze"
import { useRepertorio } from "@/hooks/useRepertorio"
import { downloadLibretto, downloadLibrettoPersona, nomeFilePersona } from "@/hooks/useLibretto"
import { usePermission } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import type { Presenza, StatoPresenza } from "@/types/presenza"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import AddPersonaOrganicoDialog from "@/components/attivita/AddPersonaOrganicoDialog"
import DeletePresenzaDialog from "@/components/attivita/DeletePresenzaDialog"

function formatNote(note: string | null): string {
  if (!note) return "—"
  return note.length > 50 ? `${note.slice(0, 50)}…` : note
}

const STATO_LABELS: Record<string, string> = {
  NONE: "Da registrare",
  PRESENTE: "Presente",
  ASSENTE: "Assente",
  GIUSTIFICATO: "Giustificato",
}

/** Tailwind classes for the stato badge, mirroring the statoBadgeClass pattern used for Iscrizione. */
function statoPresenzaBadgeClass(stato: StatoPresenza | null): string {
  switch (stato) {
    case "PRESENTE":
      return "border-transparent bg-green-100 text-green-800"
    case "ASSENTE":
      return "border-transparent bg-red-100 text-red-800"
    case "GIUSTIFICATO":
      return "border-transparent bg-yellow-100 text-yellow-800"
    default:
      return "border-transparent bg-gray-100 text-gray-700"
  }
}

function personaInPresenzaLabel(presenza: Presenza): string {
  const { nome, cognome, ragione_sociale } = presenza.persona ?? {}
  return ragione_sociale || `${nome ?? ""} ${cognome ?? ""}`.trim() || "—"
}

interface OrganicoPanelProps {
  container: OrganicoContainer
  colSpan: number
}

/** Inline sub-row listing the organico (presenze) of a single servizio or prova. */
export default function OrganicoPanel({ container, colSpan }: OrganicoPanelProps) {
  const { data, isLoading, isError } = useOrganico(container)
  // Shares the container-scoped queryKey with RepertorioPanel (mounted
  // alongside it), so this doesn't add a second request — only lets us know
  // whether the libretto can be generated (needs both organico and repertorio).
  const { data: repertorioData } = useRepertorio(container)
  const canWrite = usePermission("servizi:write")
  const { toast } = useToast()
  const updatePresenza = useUpdatePresenza()
  const [addTipo, setAddTipo] = useState<"socio" | "esterno" | null>(null)
  const [deleting, setDeleting] = useState<Presenza | null>(null)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [downloadingPersonaId, setDownloadingPersonaId] = useState<number | null>(null)

  const organico = data?.items ?? []
  const organicoColCount = 4
  const existingPersonaIds = organico.map((p) => p.persona_id)
  const repertorioCount = repertorioData?.items.length ?? 0

  const presentiCount = organico.filter((p) => p.stato === "PRESENTE").length
  const assentiCount = organico.filter((p) => p.stato === "ASSENTE").length
  const giustificatiCount = organico.filter((p) => p.stato === "GIUSTIFICATO").length
  const daRegistrareCount = organico.length - presentiCount - assentiCount - giustificatiCount

  const libretteDisabledReason =
    organico.length === 0
      ? "Nessuna persona in organico"
      : repertorioCount === 0
        ? "Nessun brano nel repertorio"
        : null

  const handleStatoChange = (presenza: Presenza, value: string) => {
    const stato = value === "NONE" ? null : (value as StatoPresenza)
    if (stato === presenza.stato) return
    updatePresenza.mutate({ id: presenza.id, input: { stato } })
  }

  const handleNoteBlur = (presenza: Presenza, value: string) => {
    const note = value.trim() || null
    if (note === presenza.note) return
    updatePresenza.mutate({ id: presenza.id, input: { note } })
  }

  const containerId = container.servizioId ?? container.provaId
  const containerKind = container.servizioId != null ? "servizio" : "prova"

  const handleDownloadZip = async () => {
    setDownloadingZip(true)
    try {
      await downloadLibretto(container, `libretto_${containerKind}_${containerId}.zip`)
      toast({ title: "Libretto scaricato" })
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    } finally {
      setDownloadingZip(false)
    }
  }

  const handleDownloadPersona = async (presenza: Presenza) => {
    setDownloadingPersonaId(presenza.id)
    try {
      const filename = `libretto_${nomeFilePersona(presenza.persona, presenza.persona_id)}.pdf`
      const { braniMancanti } = await downloadLibrettoPersona(
        container,
        presenza.persona_id,
        filename,
      )
      if (braniMancanti.length > 0) {
        toast({
          title: "Libretto scaricato con brani mancanti",
          description: braniMancanti.join(", "),
        })
      } else {
        toast({ title: "Libretto scaricato" })
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    } finally {
      setDownloadingPersonaId(null)
    }
  }

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="bg-muted/30 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Organico</h3>
              {!isLoading && !isError && (
                <p className="text-xs text-muted-foreground">
                  {organico.length === 0
                    ? "Nessuna persona in organico"
                    : `${presentiCount} presenti, ${assentiCount} assenti, ${giustificatiCount} giustificati, ${daRegistrareCount} da registrare su ${organico.length} totali`}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadZip}
                disabled={downloadingZip || libretteDisabledReason !== null}
                title={libretteDisabledReason ?? "Scarica un PDF per persona in uno ZIP"}
              >
                {downloadingZip ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Scarica libretto
              </Button>
              {canWrite && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setAddTipo("socio")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi socio
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAddTipo("esterno")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi esterno
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: organicoColCount }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={organicoColCount}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Errore nel caricamento dell'organico.
                      </TableCell>
                    </TableRow>
                  ) : organico.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={organicoColCount}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nessuna persona in organico
                      </TableCell>
                    </TableRow>
                  ) : (
                    organico.map((presenza) => (
                      <TableRow key={presenza.id}>
                        <TableCell>{personaInPresenzaLabel(presenza)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={statoPresenzaBadgeClass(presenza.stato)}
                            >
                              {STATO_LABELS[presenza.stato ?? "NONE"]}
                            </Badge>
                            {canWrite && (
                              <Select
                                value={presenza.stato ?? "NONE"}
                                onValueChange={(value) => handleStatoChange(presenza, value)}
                              >
                                <SelectTrigger className="h-8 w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">Da registrare</SelectItem>
                                  <SelectItem value="PRESENTE">Presente</SelectItem>
                                  <SelectItem value="ASSENTE">Assente</SelectItem>
                                  <SelectItem value="GIUSTIFICATO">Giustificato</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {canWrite ? (
                            <Input
                              key={`${presenza.id}-${presenza.note ?? ""}`}
                              className="h-8 w-40"
                              defaultValue={presenza.note ?? ""}
                              onBlur={(e) => handleNoteBlur(presenza, e.target.value)}
                            />
                          ) : (
                            formatNote(presenza.note)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPersona(presenza)}
                              disabled={
                                downloadingPersonaId === presenza.id || repertorioCount === 0
                              }
                              title={
                                repertorioCount === 0
                                  ? "Nessun brano nel repertorio"
                                  : "Scarica libretto"
                              }
                              aria-label="Scarica libretto"
                            >
                              {downloadingPersonaId === presenza.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            {canWrite && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleting(presenza)}
                                aria-label="Rimuovi"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <AddPersonaOrganicoDialog
          container={container}
          tipo={addTipo ?? "socio"}
          open={addTipo !== null}
          onOpenChange={(open) => {
            if (!open) setAddTipo(null)
          }}
          existingPersonaIds={existingPersonaIds}
        />
        <DeletePresenzaDialog
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
          presenza={deleting}
        />
      </TableCell>
    </TableRow>
  )
}
