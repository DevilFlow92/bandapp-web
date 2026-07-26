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
import type { Servizio } from "@/types/servizio"
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
import IndirizzoField, {
  emptyIndirizzoForm,
  resolveIndirizzoId,
  type IndirizzoFormState,
} from "@/components/indirizzi/IndirizzoField"

const CURRENT_YEAR = new Date().getFullYear()

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
  const [indirizzo, setIndirizzo] = useState<IndirizzoFormState>(emptyIndirizzoForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setIndirizzo(emptyIndirizzoForm)
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
        // The existing indirizzo (if any) is kept as-is; only fill it in when
        // the servizio doesn't have one yet.
        const indirizzo_id =
          servizio.indirizzo_id == null
            ? await resolveIndirizzoId(indirizzo, createIndirizzo.mutateAsync)
            : undefined

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
            ...(indirizzo_id !== undefined ? { indirizzo_id } : {}),
          },
        })
        toast({ title: "Servizio aggiornato" })
      } else {
        // Create an indirizzo inline only when address details were entered.
        const indirizzo_id = await resolveIndirizzoId(indirizzo, createIndirizzo.mutateAsync)

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
            <IndirizzoField
              existingIndirizzoId={servizio?.indirizzo_id}
              existingIndirizzo={servizio?.indirizzo}
              value={indirizzo}
              onChange={setIndirizzo}
              tipiIndirizzo={tipiIndirizzo.data}
              required
            />
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
