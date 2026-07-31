import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useCreateLezione, useUpdateLezione } from "@/hooks/useLezioni"
import { useCreateIndirizzo, useLookupTipiIndirizzo } from "@/hooks/useServizi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Lezione } from "@/types/lezione"
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

interface LezioneFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  corsoId: number
  /** When provided the dialog opens in edit mode. */
  lezione?: Lezione | null
}

interface LezioneFormState {
  data_lezione: string
  note: string
}

const emptyForm: LezioneFormState = {
  data_lezione: "",
  note: "",
}

export default function LezioneFormDialog({
  open,
  onOpenChange,
  corsoId,
  lezione,
}: LezioneFormDialogProps) {
  const isEdit = Boolean(lezione)
  const { toast } = useToast()

  const createLezione = useCreateLezione()
  const updateLezione = useUpdateLezione()
  const createIndirizzo = useCreateIndirizzo()
  const tipiIndirizzo = useLookupTipiIndirizzo()

  const [form, setForm] = useState<LezioneFormState>(emptyForm)
  const [indirizzo, setIndirizzo] = useState<IndirizzoFormState>(emptyIndirizzoForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setIndirizzo(emptyIndirizzoForm)
    if (lezione) {
      setForm({
        // datetime-local expects "YYYY-MM-DDTHH:MM".
        data_lezione: lezione.data_lezione?.slice(0, 16) ?? "",
        note: lezione.note ?? "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, lezione])

  const isSubmitting =
    createLezione.isPending || updateLezione.isPending || createIndirizzo.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      if (isEdit && lezione) {
        const indirizzo_id =
          lezione.indirizzo_id == null
            ? await resolveIndirizzoId(indirizzo, createIndirizzo.mutateAsync)
            : undefined

        await updateLezione.mutateAsync({
          id: lezione.id,
          input: {
            data_lezione: form.data_lezione,
            note: form.note.trim() || null,
            ...(indirizzo_id !== undefined ? { indirizzo_id } : {}),
          },
        })
        toast({ title: "Lezione aggiornata" })
      } else {
        const indirizzo_id = await resolveIndirizzoId(indirizzo, createIndirizzo.mutateAsync)

        await createLezione.mutateAsync({
          corso_id: corsoId,
          data_lezione: form.data_lezione,
          indirizzo_id,
          note: form.note.trim() || null,
        })
        toast({ title: "Lezione creata" })
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
          <DialogTitle>{isEdit ? "Modifica lezione" : "Nuova lezione"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Aggiorna i dati della lezione." : "Inserisci i dati della nuova lezione."}
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
            <Label htmlFor="data_lezione">Data e ora *</Label>
            <Input
              id="data_lezione"
              type="datetime-local"
              required
              value={form.data_lezione}
              onChange={(e) => setForm((f) => ({ ...f, data_lezione: e.target.value }))}
            />
          </div>

          <fieldset className="space-y-4">
            <IndirizzoField
              existingIndirizzoId={lezione?.indirizzo_id}
              existingIndirizzo={lezione?.indirizzo}
              value={indirizzo}
              onChange={setIndirizzo}
              tipiIndirizzo={tipiIndirizzo.data}
            />
          </fieldset>

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
