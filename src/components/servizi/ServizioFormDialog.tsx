import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  useCreateIndirizzo,
  useCreateServizio,
  useLookupTipiIndirizzo,
  useUpdateServizio,
} from "@/hooks/useServizi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { IndirizzoInServizio, Servizio } from "@/types/servizio"
import CommittentePicker from "@/components/committenti/CommittentePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ComuneSelect from "@/components/ui/ComuneSelect"

const CURRENT_YEAR = new Date().getFullYear()
/** Default tipo indirizzo "Servizio" (codice 4), pre-selected for new servizi. */
const DEFAULT_TIPO_INDIRIZZO_CODICE = "4"

export function formatIndirizzoServizio(ind: IndirizzoInServizio | null | undefined): string {
  if (!ind) return "—"
  const parts = [
    ind.prima_riga,
    ind.numero_civico,
    ind.cap,
    ind.comune?.descrizione,
    ind.comune?.provincia?.sigla ? `(${ind.comune.provincia.sigla})` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : "—"
}

interface ServizioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  servizio?: Servizio | null
}

interface ServizioFormState {
  descrizione_servizio: string
  anno: string
  data_servizio: string
  note: string
  committente_id: number | null
  referente: string
  compenso_pattuito: string
}

const emptyForm: ServizioFormState = {
  descrizione_servizio: "",
  anno: String(CURRENT_YEAR),
  data_servizio: "",
  note: "",
  committente_id: null,
  referente: "",
  compenso_pattuito: "",
}

interface IndirizzoFormState {
  tipo_indirizzo_codice: string
  prima_riga: string
  numero_civico: string
  cap: string
  comune_codice: number | null
}

const emptyIndirizzo: IndirizzoFormState = {
  tipo_indirizzo_codice: DEFAULT_TIPO_INDIRIZZO_CODICE,
  prima_riga: "",
  numero_civico: "",
  cap: "",
  comune_codice: null,
}

export default function ServizioFormDialog({
  open,
  onOpenChange,
  servizio,
}: ServizioFormDialogProps) {
  const isEdit = Boolean(servizio)
  const { toast } = useToast()
  const { banda } = useBanda()

  const createServizio = useCreateServizio()
  const updateServizio = useUpdateServizio()
  const createIndirizzo = useCreateIndirizzo()
  const tipiIndirizzo = useLookupTipiIndirizzo()

  const [form, setForm] = useState<ServizioFormState>(emptyForm)
  const [indirizzo, setIndirizzo] = useState<IndirizzoFormState>(emptyIndirizzo)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setIndirizzo(emptyIndirizzo)
    if (servizio) {
      setForm({
        descrizione_servizio: servizio.descrizione_servizio,
        anno: String(servizio.anno),
        // datetime-local expects "YYYY-MM-DDTHH:MM".
        data_servizio: servizio.data_servizio?.slice(0, 16) ?? "",
        note: servizio.note ?? "",
        committente_id: servizio.committente_id,
        referente: servizio.referente ?? "",
        compenso_pattuito:
          servizio.compenso_pattuito != null ? String(servizio.compenso_pattuito) : "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, servizio])

  const isSubmitting =
    createServizio.isPending || updateServizio.isPending || createIndirizzo.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const anno = Number(form.anno)
    if (Number.isNaN(anno)) {
      setError("L'anno deve essere un numero valido.")
      return
    }

    const compensoPattuito =
      form.compenso_pattuito.trim() === "" ? null : Number(form.compenso_pattuito)
    if (compensoPattuito !== null && Number.isNaN(compensoPattuito)) {
      setError("Il compenso pattuito deve essere un numero valido.")
      return
    }

    try {
      if (isEdit && servizio) {
        // Edit mode keeps the existing indirizzo; it is not re-created here.
        await updateServizio.mutateAsync({
          id: servizio.id,
          input: {
            anno,
            descrizione_servizio: form.descrizione_servizio.trim(),
            data_servizio: form.data_servizio,
            note: form.note.trim() || null,
            committente_id: form.committente_id,
            referente: form.referente.trim() || null,
            compenso_pattuito: compensoPattuito,
          },
        })
        toast({ title: "Servizio aggiornato" })
      } else {
        // Create an indirizzo inline only when address details were entered.
        const primaRiga = indirizzo.prima_riga.trim()
        const anyAddressFilled =
          primaRiga !== "" ||
          indirizzo.numero_civico.trim() !== "" ||
          indirizzo.cap.trim() !== "" ||
          indirizzo.comune_codice !== null

        if (anyAddressFilled && !primaRiga) {
          setError("La via / piazza è obbligatoria se inserisci un indirizzo.")
          return
        }

        let indirizzo_id: number | undefined
        if (primaRiga) {
          const created = await createIndirizzo.mutateAsync({
            tipo_indirizzo_codice: Number(indirizzo.tipo_indirizzo_codice),
            prima_riga: primaRiga,
            numero_civico: indirizzo.numero_civico.trim() || null,
            cap: indirizzo.cap.trim() || null,
            comune_codice: indirizzo.comune_codice,
          })
          indirizzo_id = created.id
        }

        await createServizio.mutateAsync({
          banda_codice: banda!.codice,
          anno,
          descrizione_servizio: form.descrizione_servizio.trim(),
          data_servizio: form.data_servizio,
          indirizzo_id,
          note: form.note.trim() || null,
          committente_id: form.committente_id,
          referente: form.referente.trim() || null,
          compenso_pattuito: compensoPattuito,
        })
        toast({ title: "Servizio creato" })
      }
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica servizio" : "Nuovo servizio"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Aggiorna i dati del servizio." : "Inserisci i dati del nuovo servizio."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="descrizione_servizio">Descrizione *</Label>
            <Input
              id="descrizione_servizio"
              required
              value={form.descrizione_servizio}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  descrizione_servizio: e.target.value,
                }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="anno">Anno *</Label>
              <Input
                id="anno"
                type="number"
                required
                value={form.anno}
                onChange={(e) => setForm((f) => ({ ...f, anno: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_servizio">Data e ora *</Label>
              <Input
                id="data_servizio"
                type="datetime-local"
                required
                value={form.data_servizio}
                onChange={(e) => setForm((f) => ({ ...f, data_servizio: e.target.value }))}
              />
            </div>
          </div>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Indirizzo</legend>

            {isEdit ? (
              <div className="space-y-1 rounded-md border px-3 py-2 text-sm">
                <p>{formatIndirizzoServizio(servizio?.indirizzo)}</p>
                <p className="text-xs text-muted-foreground">
                  Indirizzo già associato (ID: {servizio?.indirizzo_id}). Per modificare
                  l'indirizzo, gestirlo separatamente.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Facoltativo. Compila la via per creare e associare un nuovo indirizzo.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_indirizzo">Tipo</Label>
                    <Select
                      value={indirizzo.tipo_indirizzo_codice}
                      onValueChange={(value) =>
                        setIndirizzo((i) => ({
                          ...i,
                          tipo_indirizzo_codice: value,
                        }))
                      }
                    >
                      <SelectTrigger id="tipo_indirizzo">
                        <SelectValue placeholder="Seleziona…" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipiIndirizzo.data?.map((tipo) => (
                          <SelectItem key={tipo.codice} value={String(tipo.codice)}>
                            {tipo.descrizione}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_civico">Numero civico</Label>
                    <Input
                      id="numero_civico"
                      value={indirizzo.numero_civico}
                      onChange={(e) =>
                        setIndirizzo((i) => ({
                          ...i,
                          numero_civico: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prima_riga">Via / Piazza</Label>
                  <Input
                    id="prima_riga"
                    value={indirizzo.prima_riga}
                    onChange={(e) =>
                      setIndirizzo((i) => ({
                        ...i,
                        prima_riga: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2 sm:max-w-[12rem]">
                  <Label htmlFor="cap">CAP</Label>
                  <Input
                    id="cap"
                    value={indirizzo.cap}
                    onChange={(e) => setIndirizzo((i) => ({ ...i, cap: e.target.value }))}
                  />
                </div>

                <ComuneSelect
                  value={indirizzo.comune_codice}
                  onChange={(codice) => setIndirizzo((i) => ({ ...i, comune_codice: codice }))}
                  label="Comune"
                />
              </>
            )}
          </fieldset>

          <div className="space-y-2">
            <Label>Committente</Label>
            <CommittentePicker
              bandaCodice={banda!.codice}
              value={form.committente_id}
              onChange={(id) => setForm((f) => ({ ...f, committente_id: id }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="referente">Referente</Label>
              <Input
                id="referente"
                value={form.referente}
                onChange={(e) => setForm((f) => ({ ...f, referente: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compenso_pattuito">Compenso pattuito (€)</Label>
              <Input
                id="compenso_pattuito"
                type="number"
                step="0.01"
                value={form.compenso_pattuito}
                onChange={(e) => setForm((f) => ({ ...f, compenso_pattuito: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <textarea
              id="note"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salva" : "Crea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
