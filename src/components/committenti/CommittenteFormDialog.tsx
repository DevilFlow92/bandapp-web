import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useCreateCommittente, useUpdateCommittente } from "@/hooks/useCommittenti"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Committente } from "@/types/committente"
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

interface CommittenteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  committente?: Committente | null
  /** Pre-fills denominazione in create mode (e.g. from a picker's search text). */
  initialDenominazione?: string
  /** Called with the created/updated committente right after a successful submit. */
  onSaved?: (committente: Committente) => void
}

interface CommittenteFormState {
  denominazione: string
  codice_fiscale_piva: string
  note: string
}

const emptyForm: CommittenteFormState = {
  denominazione: "",
  codice_fiscale_piva: "",
  note: "",
}

export default function CommittenteFormDialog({
  open,
  onOpenChange,
  committente,
  initialDenominazione,
  onSaved,
}: CommittenteFormDialogProps) {
  const isEdit = Boolean(committente)
  const { toast } = useToast()
  const { banda } = useBanda()

  const createCommittente = useCreateCommittente()
  const updateCommittente = useUpdateCommittente()

  const [form, setForm] = useState<CommittenteFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (committente) {
      setForm({
        denominazione: committente.denominazione,
        codice_fiscale_piva: committente.codice_fiscale_piva ?? "",
        note: committente.note ?? "",
      })
    } else {
      setForm({ ...emptyForm, denominazione: initialDenominazione ?? "" })
    }
  }, [open, committente, initialDenominazione])

  const isSubmitting = createCommittente.isPending || updateCommittente.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      let saved: Committente
      if (isEdit && committente) {
        saved = await updateCommittente.mutateAsync({
          id: committente.id,
          input: {
            denominazione: form.denominazione.trim(),
            codice_fiscale_piva: form.codice_fiscale_piva.trim() || null,
            note: form.note.trim() || null,
          },
        })
        toast({ title: "Committente aggiornato" })
      } else {
        saved = await createCommittente.mutateAsync({
          banda_codice: banda!.codice,
          denominazione: form.denominazione.trim(),
          codice_fiscale_piva: form.codice_fiscale_piva.trim() || null,
          note: form.note.trim() || null,
        })
        toast({ title: "Committente creato" })
      }
      onSaved?.(saved)
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica committente" : "Nuovo committente"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dati del committente."
              : "Inserisci i dati del nuovo committente."}
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
            <Label htmlFor="denominazione">Denominazione *</Label>
            <Input
              id="denominazione"
              required
              value={form.denominazione}
              onChange={(e) => setForm((f) => ({ ...f, denominazione: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codice_fiscale_piva">Codice fiscale / P.IVA</Label>
            <Input
              id="codice_fiscale_piva"
              value={form.codice_fiscale_piva}
              onChange={(e) => setForm((f) => ({ ...f, codice_fiscale_piva: e.target.value }))}
            />
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
