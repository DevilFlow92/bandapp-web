import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import {
  SCHEDE_ALUNNO_KEY,
  useCreateSchedaAlunnoVoce,
  useDeleteSchedaAlunnoVoce,
  useUpdateSchedaAlunnoVoce,
} from "@/hooks/useSchedeAlunno"
import { useCatalogoProgrammiAttivo } from "@/hooks/useCatalogoProgrammi"
import { useConfirm } from "@/hooks/useConfirm"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import type { SchedaAlunnoVoce, StatoVoceProgramma } from "@/types/scheda_alunno_voce"
import type { VoceProgrammaCatalogo } from "@/types/voce_programma_catalogo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATO_LABELS: Record<StatoVoceProgramma, string> = {
  da_iniziare: "Da iniziare",
  in_corso: "In corso",
  acquisita: "Acquisita",
}

const STATI: StatoVoceProgramma[] = ["da_iniziare", "in_corso", "acquisita"]

interface SchedaAlunnoVociEditorProps {
  /** null finché la scheda alunno non è ancora stata creata: le voci sono annidate sotto lo scheda_alunno_id. */
  schedaAlunnoId: number | null
  voci: SchedaAlunnoVoce[]
  tipoCorsoCodice: number
}

/** Raggruppa il catalogo per categoria, nell'ordine di prima apparizione. */
function groupByCategoria(catalogo: VoceProgrammaCatalogo[]) {
  const groups = new Map<string, VoceProgrammaCatalogo[]>()
  for (const voce of catalogo) {
    const key = voce.categoria.descrizione
    const list = groups.get(key)
    if (list) {
      list.push(voce)
    } else {
      groups.set(key, [voce])
    }
  }
  return Array.from(groups.entries())
}

export default function SchedaAlunnoVociEditor({
  schedaAlunnoId,
  voci,
  tipoCorsoCodice,
}: SchedaAlunnoVociEditorProps) {
  const { toast } = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()

  const catalogo = useCatalogoProgrammiAttivo(tipoCorsoCodice, schedaAlunnoId != null)
  const catalogoGruppi = useMemo(() => groupByCategoria(catalogo.data ?? []), [catalogo.data])

  const createVoce = useCreateSchedaAlunnoVoce()
  const updateVoce = useUpdateSchedaAlunnoVoce()
  const deleteVoce = useDeleteSchedaAlunnoVoce()
  const [swapping, setSwapping] = useState(false)

  const [adding, setAdding] = useState(false)
  const [nuovaVoceCatalogoId, setNuovaVoceCatalogoId] = useState("")
  const [nuovoStato, setNuovoStato] = useState<StatoVoceProgramma>("da_iniziare")
  const [nuovoDettaglio, setNuovoDettaglio] = useState("")

  const vociOrdinate = useMemo(() => [...voci].sort((a, b) => a.ordine - b.ordine), [voci])

  if (schedaAlunnoId == null) {
    return (
      <p className="text-sm text-muted-foreground">
        Crea la scheda alunno per aggiungere voci di programma.
      </p>
    )
  }

  const resetAddForm = () => {
    setAdding(false)
    setNuovaVoceCatalogoId("")
    setNuovoStato("da_iniziare")
    setNuovoDettaglio("")
  }

  const handleStatoChange = (voce: SchedaAlunnoVoce, stato: StatoVoceProgramma) => {
    if (stato === voce.stato) return
    updateVoce.mutate(
      { schedaAlunnoId, voceId: voce.id, input: { stato } },
      {
        onError: (err) => {
          toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
        },
      },
    )
  }

  const handleDettaglioBlur = (voce: SchedaAlunnoVoce, value: string) => {
    const dettaglio = value.trim() || null
    if (dettaglio === voce.dettaglio) return
    updateVoce.mutate(
      { schedaAlunnoId, voceId: voce.id, input: { dettaglio } },
      {
        onError: (err) => {
          toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
        },
      },
    )
  }

  const handleSwap = async (voce: SchedaAlunnoVoce, other: SchedaAlunnoVoce) => {
    setSwapping(true)
    try {
      await updateVoce.mutateAsync({
        schedaAlunnoId,
        voceId: voce.id,
        input: { ordine: other.ordine },
      })
      try {
        await updateVoce.mutateAsync({
          schedaAlunnoId,
          voceId: other.id,
          input: { ordine: voce.ordine },
        })
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Riordino non riuscito",
          description: `Lo scambio non è stato completato: ${getErrorMessage(err)}. L'ordine mostrato è stato ricaricato dal server.`,
        })
        queryClient.invalidateQueries({ queryKey: SCHEDE_ALUNNO_KEY })
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    } finally {
      setSwapping(false)
    }
  }

  const handleRemove = async (voce: SchedaAlunnoVoce) => {
    const ok = await confirm({
      title: "Rimuovi voce",
      description: `Rimuovere «${voce.voce_catalogo.testo}» dal programma?`,
      confirmLabel: "Rimuovi",
      variant: "destructive",
    })
    if (!ok) return
    deleteVoce.mutate(
      { schedaAlunnoId, voceId: voce.id },
      {
        onError: (err) => {
          toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
        },
      },
    )
  }

  const handleAddConfirm = async () => {
    if (!nuovaVoceCatalogoId) return
    try {
      await createVoce.mutateAsync({
        schedaAlunnoId,
        input: {
          voce_catalogo_id: Number(nuovaVoceCatalogoId),
          stato: nuovoStato,
          dettaglio: nuovoDettaglio.trim() || null,
          ordine: voci.length,
        },
      })
      resetAddForm()
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  return (
    <div className="space-y-3">
      {vociOrdinate.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">Nessuna voce di programma inserita.</p>
      )}

      {vociOrdinate.map((voce, index) => (
        <div key={voce.id} className="space-y-2 rounded-md border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm">
              <span className="text-xs text-muted-foreground">
                {voce.voce_catalogo.categoria.descrizione}
              </span>
              <p className="font-medium">{voce.voce_catalogo.testo}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleSwap(voce, vociOrdinate[index - 1])}
                disabled={index === 0 || swapping}
                aria-label="Sposta su"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleSwap(voce, vociOrdinate[index + 1])}
                disabled={index === vociOrdinate.length - 1 || swapping}
                aria-label="Sposta giù"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleRemove(voce)}
                disabled={deleteVoce.isPending}
                aria-label="Rimuovi"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`voce-${voce.id}-stato`} className="text-xs">
                Stato
              </Label>
              <Select
                value={voce.stato}
                onValueChange={(value) => handleStatoChange(voce, value as StatoVoceProgramma)}
              >
                <SelectTrigger id={`voce-${voce.id}-stato`} className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATI.map((stato) => (
                    <SelectItem key={stato} value={stato}>
                      {STATO_LABELS[stato]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`voce-${voce.id}-dettaglio`} className="text-xs">
                Dettaglio
              </Label>
              <Input
                id={`voce-${voce.id}-dettaglio`}
                key={`${voce.id}-${voce.dettaglio ?? ""}`}
                className="h-8"
                defaultValue={voce.dettaglio ?? ""}
                placeholder="Facoltativo"
                onBlur={(e) => handleDettaglioBlur(voce, e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="nuova-voce-catalogo" className="text-xs">
              Voce di catalogo *
            </Label>
            <Select value={nuovaVoceCatalogoId} onValueChange={setNuovaVoceCatalogoId}>
              <SelectTrigger id="nuova-voce-catalogo" className="h-8" disabled={catalogo.isLoading}>
                <SelectValue placeholder="Seleziona voce…" />
              </SelectTrigger>
              <SelectContent>
                {catalogoGruppi.map(([categoria, items]) => (
                  <SelectGroup key={categoria}>
                    <SelectLabel>{categoria}</SelectLabel>
                    {items.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.testo}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="nuova-voce-stato" className="text-xs">
                Stato
              </Label>
              <Select
                value={nuovoStato}
                onValueChange={(v) => setNuovoStato(v as StatoVoceProgramma)}
              >
                <SelectTrigger id="nuova-voce-stato" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATI.map((stato) => (
                    <SelectItem key={stato} value={stato}>
                      {STATO_LABELS[stato]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="nuova-voce-dettaglio" className="text-xs">
                Dettaglio
              </Label>
              <Input
                id="nuova-voce-dettaglio"
                className="h-8"
                value={nuovoDettaglio}
                placeholder="Facoltativo"
                onChange={(e) => setNuovoDettaglio(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={resetAddForm}>
              Annulla
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!nuovaVoceCatalogoId || createVoce.isPending}
              onClick={handleAddConfirm}
            >
              {createVoce.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi voce
        </Button>
      )}
    </div>
  )
}
