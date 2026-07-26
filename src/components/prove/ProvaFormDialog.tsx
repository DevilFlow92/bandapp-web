import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useCreateProva, useUpdateProva } from "@/hooks/useProve"
import { useCreateIndirizzo, useLookupTipiIndirizzo } from "@/hooks/useServizi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Prova } from "@/types/prova"
import ServizioPicker from "@/components/prove/ServizioPicker"
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

interface ProvaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  prova?: Prova | null
}

interface ProvaFormState {
  data_prova: string
  servizio_id: number | null
  note: string
}

const emptyForm: ProvaFormState = {
  data_prova: "",
  servizio_id: null,
  note: "",
}

export default function ProvaFormDialog({ open, onOpenChange, prova }: ProvaFormDialogProps) {
  const isEdit = Boolean(prova)
  const { toast } = useToast()
  const { banda } = useBanda()

  const createProva = useCreateProva()
  const updateProva = useUpdateProva()
  const createIndirizzo = useCreateIndirizzo()
  const tipiIndirizzo = useLookupTipiIndirizzo()

  const [form, setForm] = useState<ProvaFormState>(emptyForm)
  const [indirizzo, setIndirizzo] = useState<IndirizzoFormState>(emptyIndirizzoForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setIndirizzo(emptyIndirizzoForm)
    if (prova) {
      setForm({
        // datetime-local expects "YYYY-MM-DDTHH:MM".
        data_prova: prova.data_prova?.slice(0, 16) ?? "",
        servizio_id: prova.servizio_id,
        note: prova.note ?? "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, prova])

  const isSubmitting = createProva.isPending || updateProva.isPending || createIndirizzo.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      if (isEdit && prova) {
        // The existing indirizzo (if any) is kept as-is; only fill it in when
        // the prova doesn't have one yet.
        const indirizzo_id =
          prova.indirizzo_id == null
            ? await resolveIndirizzoId(indirizzo, createIndirizzo.mutateAsync)
            : undefined

        await updateProva.mutateAsync({
          id: prova.id,
          input: {
            data_prova: form.data_prova,
            servizio_id: form.servizio_id,
            note: form.note.trim() || null,
            ...(indirizzo_id !== undefined ? { indirizzo_id } : {}),
          },
        })
        toast({ title: "Prova aggiornata" })
      } else {
        // Create an indirizzo inline only when address details were entered.
        const indirizzo_id = await resolveIndirizzoId(indirizzo, createIndirizzo.mutateAsync)

        await createProva.mutateAsync({
          banda_codice: banda!.codice,
          data_prova: form.data_prova,
          indirizzo_id,
          servizio_id: form.servizio_id,
          note: form.note.trim() || null,
        })
        toast({ title: "Prova creata" })
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
          <DialogTitle>{isEdit ? "Modifica prova" : "Nuova prova"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Aggiorna i dati della prova." : "Inserisci i dati della nuova prova."}
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
            <Label htmlFor="data_prova">Data e ora *</Label>
            <Input
              id="data_prova"
              type="datetime-local"
              required
              value={form.data_prova}
              onChange={(e) => setForm((f) => ({ ...f, data_prova: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Servizio</Label>
            <p className="text-xs text-muted-foreground">
              Facoltativo. Orienta la prova verso un servizio esistente.
            </p>
            <ServizioPicker
              bandaCodice={banda!.codice}
              value={form.servizio_id}
              onChange={(id) => setForm((f) => ({ ...f, servizio_id: id }))}
            />
          </div>

          <fieldset className="space-y-4">
            <IndirizzoField
              existingIndirizzoId={prova?.indirizzo_id}
              existingIndirizzo={prova?.indirizzo}
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
