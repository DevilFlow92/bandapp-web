import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  useOrganico,
  useUpdatePresenza,
  useBulkUpdatePresenze,
  useCreatePresenza,
} from "@/hooks/usePresenze"
import { useIscrizioniCorsoByCorso } from "@/hooks/useIscrizioniCorso"
import { usePermission } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import type { Presenza, StatoPresenza } from "@/types/presenza"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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

/** Codice di stati_iscrizione_corso per un'iscrizione ritirata/annullata (card #173). */
const STATO_ISCRIZIONE_ANNULLATA = 3

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

interface RegistroPresenzePanelProps {
  corsoId: number
  lezioneId: number
  colSpan: number
}

/**
 * Registro presenze di una singola lezione. A differenza dell'organico di un
 * Servizio/Prova (componibile liberamente persona per persona), l'organico di
 * una lezione è dato: coincide con gli alunni iscritti al corso. Per questo
 * qui non esistono i pulsanti "Aggiungi socio/esterno" né la rimozione
 * dall'organico: alla (ri)apertura del pannello viene sincronizzato creando
 * la Presenza mancante per ogni iscritto non ancora presente nel registro
 * (le iscrizioni annullate sono escluse). La sincronizzazione è volutamente
 * lazy, non alla creazione della lezione: un alunno iscritto dopo che una
 * lezione passata è già stata registrata non deve comparire in quel
 * registro.
 */
export default function RegistroPresenzePanel({
  corsoId,
  lezioneId,
  colSpan,
}: RegistroPresenzePanelProps) {
  const { data, isLoading, isError } = useOrganico({ lezioneId })
  const { data: iscrizioniData, isLoading: isLoadingIscrizioni } = useIscrizioniCorsoByCorso(
    corsoId,
    1,
    100,
  )
  const canWrite = usePermission("corsi:write")
  const { toast } = useToast()
  const updatePresenza = useUpdatePresenza()
  const bulkUpdatePresenze = useBulkUpdatePresenze()
  const createPresenza = useCreatePresenza()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkStato, setBulkStato] = useState<string>("PRESENTE")
  const [syncing, setSyncing] = useState(false)
  const syncedRef = useRef<number | null>(null)

  const organico = data?.items ?? []
  const iscrizioni = iscrizioniData?.items ?? []
  const organicoColCount = canWrite ? 4 : 3

  useEffect(() => {
    if (!canWrite || isLoading || isLoadingIscrizioni) return
    if (syncedRef.current === lezioneId) return
    syncedRef.current = lezioneId

    const existingPersonaIds = new Set(organico.map((p) => p.persona_id))
    const mancanti = iscrizioni.filter(
      (isc) =>
        isc.stato_iscrizione_corso_codice !== STATO_ISCRIZIONE_ANNULLATA &&
        !existingPersonaIds.has(isc.persona_id),
    )
    if (mancanti.length === 0) return

    setSyncing(true)
    Promise.all(
      mancanti.map((isc) =>
        createPresenza.mutateAsync({ lezione_id: lezioneId, persona_id: isc.persona_id }),
      ),
    )
      .catch((err) => {
        toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
      })
      .finally(() => setSyncing(false))
    // Sincronizza una sola volta per apertura del pannello (organico/iscrizioni
    // cambiano identità ad ogni refetch, syncedRef evita un loop di create).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite, isLoading, isLoadingIscrizioni, lezioneId])

  const allSelected = organico.length > 0 && organico.every((p) => selected.has(p.id))
  const someSelected = !allSelected && organico.some((p) => selected.has(p.id))

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(organico.map((p) => p.id)) : new Set())
  }

  const toggleSelectRow = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleBulkApply = () => {
    const stato = bulkStato === "NONE" ? null : (bulkStato as StatoPresenza)
    bulkUpdatePresenze.mutate(
      Array.from(selected).map((presenza_id) => ({ presenza_id, stato })),
      {
        onSuccess: () => {
          toast({ title: "Stato aggiornato per i selezionati" })
          setSelected(new Set())
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
        },
      },
    )
  }

  const presentiCount = organico.filter((p) => p.stato === "PRESENTE").length
  const assentiCount = organico.filter((p) => p.stato === "ASSENTE").length
  const giustificatiCount = organico.filter((p) => p.stato === "GIUSTIFICATO").length
  const daRegistrareCount = organico.length - presentiCount - assentiCount - giustificatiCount

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

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="bg-muted/30 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Registro presenze</h3>
              {!isLoading && !isError && (
                <p className="text-xs text-muted-foreground">
                  {syncing ? (
                    <>
                      <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                      Aggiornamento registro con gli iscritti al corso…
                    </>
                  ) : organico.length === 0 ? (
                    "Nessun alunno iscritto al corso"
                  ) : (
                    `${presentiCount} presenti, ${assentiCount} assenti, ${giustificatiCount} giustificati, ${daRegistrareCount} da registrare su ${organico.length} totali`
                  )}
                </p>
              )}
            </div>
          </div>

          {canWrite && selected.size > 0 && (
            <div className="flex items-center gap-3 rounded-md border bg-background p-2">
              <span className="text-sm text-muted-foreground">{selected.size} selezionati</span>
              <Select value={bulkStato} onValueChange={setBulkStato}>
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Da registrare</SelectItem>
                  <SelectItem value="PRESENTE">Presente</SelectItem>
                  <SelectItem value="ASSENTE">Assente</SelectItem>
                  <SelectItem value="GIUSTIFICATO">Giustificato</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleBulkApply} disabled={bulkUpdatePresenze.isPending}>
                {bulkUpdatePresenze.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Imposta stato per i selezionati
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canWrite && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={someSelected ? "indeterminate" : allSelected}
                          onCheckedChange={toggleSelectAll}
                          disabled={organico.length === 0}
                          aria-label="Seleziona tutti"
                        />
                      </TableHead>
                    )}
                    <TableHead>Alunno</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading || isLoadingIscrizioni ? (
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
                        Errore nel caricamento del registro presenze.
                      </TableCell>
                    </TableRow>
                  ) : organico.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={organicoColCount}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nessun alunno iscritto al corso
                      </TableCell>
                    </TableRow>
                  ) : (
                    organico.map((presenza) => (
                      <TableRow key={presenza.id}>
                        {canWrite && (
                          <TableCell>
                            <Checkbox
                              checked={selected.has(presenza.id)}
                              onCheckedChange={(checked) => toggleSelectRow(presenza.id, checked)}
                              aria-label={`Seleziona ${personaInPresenzaLabel(presenza)}`}
                            />
                          </TableCell>
                        )}
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
