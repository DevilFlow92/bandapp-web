import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  useCreateServizio,
  useLookupIndirizzi,
  useUpdateServizio,
} from "@/hooks/useServizi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Indirizzo, Servizio } from "@/types/servizio"
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

const NONE_VALUE = "__none__"
const CURRENT_YEAR = new Date().getFullYear()

export function formatIndirizzo(indirizzo: Indirizzo): string {
  const street = [indirizzo.via, indirizzo.civico].filter(Boolean).join(" ")
  const comune = indirizzo?.comune?.descrizione ?? ""
  return comune ? `${street} — ${comune}` : street
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
  indirizzo_id: string
  note: string
}

const emptyForm: ServizioFormState = {
  descrizione_servizio: "",
  anno: String(CURRENT_YEAR),
  data_servizio: "",
  indirizzo_id: NONE_VALUE,
  note: "",
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
  const indirizzi = useLookupIndirizzi()

  const [form, setForm] = useState<ServizioFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (servizio) {
      setForm({
        descrizione_servizio: servizio.descrizione_servizio,
        anno: String(servizio.anno),
        // datetime-local expects "YYYY-MM-DDTHH:MM".
        data_servizio: servizio.data_servizio?.slice(0, 16) ?? "",
        indirizzo_id: String(servizio.indirizzo_id),
        note: servizio.note ?? "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, servizio])

  const isSubmitting = createServizio.isPending || updateServizio.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (form.indirizzo_id === NONE_VALUE) {
      setError("L'indirizzo è obbligatorio.")
      return
    }

    const anno = Number(form.anno)
    if (Number.isNaN(anno)) {
      setError("L'anno deve essere un numero valido.")
      return
    }

    try {
      if (isEdit && servizio) {
        await updateServizio.mutateAsync({
          id: servizio.id,
          input: {
            anno,
            descrizione_servizio: form.descrizione_servizio.trim(),
            data_servizio: form.data_servizio,
            indirizzo_id: Number(form.indirizzo_id),
            note: form.note.trim() || null,
          },
        })
        toast({ title: "Servizio aggiornato" })
      } else {
        await createServizio.mutateAsync({
          banda_codice: banda!.codice,
          anno,
          descrizione_servizio: form.descrizione_servizio.trim(),
          data_servizio: form.data_servizio,
          indirizzo_id: Number(form.indirizzo_id),
          note: form.note.trim() || null,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica servizio" : "Nuovo servizio"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dati del servizio."
              : "Inserisci i dati del nuovo servizio."}
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, anno: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_servizio">Data e ora *</Label>
              <Input
                id="data_servizio"
                type="datetime-local"
                required
                value={form.data_servizio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, data_servizio: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="indirizzo">Indirizzo *</Label>
            <Select
              value={form.indirizzo_id}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, indirizzo_id: value }))
              }
            >
              <SelectTrigger id="indirizzo">
                <SelectValue placeholder="Seleziona…" />
              </SelectTrigger>
              <SelectContent>
                {indirizzi.data?.map((indirizzo) => (
                  <SelectItem key={indirizzo.id} value={String(indirizzo.id)}>
                    {formatIndirizzo(indirizzo)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <textarea
              id="note"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.note}
              onChange={(e) =>
                setForm((f) => ({ ...f, note: e.target.value }))
              }
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
