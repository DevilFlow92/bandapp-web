import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  useCreateServizio,
  useLookupIndirizzi,
  useUpdateServizio,
} from "@/hooks/useServizi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
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

export function formatIndirizzo(indirizzo: Indirizzo): string {
  const street = [indirizzo.via, indirizzo.civico].filter(Boolean).join(" ")
  return `${street} — ${indirizzo.comune.nome}`
}

interface ServizioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  servizio?: Servizio | null
}

interface ServizioFormState {
  titolo: string
  data: string
  ora_inizio: string
  ora_fine: string
  luogo: string
  note: string
  indirizzo_id: string
}

const emptyForm: ServizioFormState = {
  titolo: "",
  data: "",
  ora_inizio: "",
  ora_fine: "",
  luogo: "",
  note: "",
  indirizzo_id: NONE_VALUE,
}

export default function ServizioFormDialog({
  open,
  onOpenChange,
  servizio,
}: ServizioFormDialogProps) {
  const isEdit = Boolean(servizio)
  const { toast } = useToast()

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
        titolo: servizio.titolo,
        data: servizio.data?.slice(0, 10) ?? "",
        ora_inizio: servizio.ora_inizio ?? "",
        ora_fine: servizio.ora_fine ?? "",
        luogo: servizio.luogo,
        note: servizio.note ?? "",
        indirizzo_id:
          servizio.indirizzo_id != null
            ? String(servizio.indirizzo_id)
            : NONE_VALUE,
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, servizio])

  const isSubmitting = createServizio.isPending || updateServizio.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const payload = {
      titolo: form.titolo.trim(),
      data: form.data,
      ora_inizio: form.ora_inizio || null,
      ora_fine: form.ora_fine || null,
      luogo: form.luogo.trim(),
      note: form.note.trim() || null,
      indirizzo_id:
        form.indirizzo_id === NONE_VALUE ? null : Number(form.indirizzo_id),
    }

    try {
      if (isEdit && servizio) {
        await updateServizio.mutateAsync({ id: servizio.id, input: payload })
        toast({ title: "Servizio aggiornato" })
      } else {
        await createServizio.mutateAsync(payload)
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
            <Label htmlFor="titolo">Titolo *</Label>
            <Input
              id="titolo"
              required
              value={form.titolo}
              onChange={(e) =>
                setForm((f) => ({ ...f, titolo: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                required
                value={form.data}
                onChange={(e) =>
                  setForm((f) => ({ ...f, data: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ora_inizio">Ora inizio</Label>
              <Input
                id="ora_inizio"
                type="time"
                value={form.ora_inizio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ora_inizio: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ora_fine">Ora fine</Label>
              <Input
                id="ora_fine"
                type="time"
                value={form.ora_fine}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ora_fine: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="luogo">Luogo *</Label>
            <Input
              id="luogo"
              required
              value={form.luogo}
              onChange={(e) =>
                setForm((f) => ({ ...f, luogo: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="indirizzo">Indirizzo</Label>
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
                <SelectItem value={NONE_VALUE}>Nessuno</SelectItem>
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
