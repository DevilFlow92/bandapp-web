import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  useCreateSpartito,
  useLookupTipiSpartito,
  useUpdateSpartito,
} from "@/hooks/useSpartiti"
import { useLookupStrumenti } from "@/hooks/useSoci"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Spartito } from "@/types/spartito"
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

interface SpartitoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  spartito?: Spartito | null
}

interface SpartitoFormState {
  titolo: string
  autore: string
  anno: string
  tipo_spartito_codice: string
  strumento_codice: string
  scaffale: string
  ripiano: string
  cartella: string
  note: string
}

const emptyForm: SpartitoFormState = {
  titolo: "",
  autore: "",
  anno: "",
  tipo_spartito_codice: "",
  strumento_codice: NONE_VALUE,
  scaffale: "",
  ripiano: "",
  cartella: "",
  note: "",
}

export default function SpartitoFormDialog({
  open,
  onOpenChange,
  spartito,
}: SpartitoFormDialogProps) {
  const isEdit = Boolean(spartito)
  const { toast } = useToast()

  const createSpartito = useCreateSpartito()
  const updateSpartito = useUpdateSpartito()
  const tipiSpartito = useLookupTipiSpartito()
  const strumenti = useLookupStrumenti()

  const [form, setForm] = useState<SpartitoFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (spartito) {
      setForm({
        titolo: spartito.titolo,
        autore: spartito.autore ?? "",
        anno: spartito.anno != null ? String(spartito.anno) : "",
        tipo_spartito_codice: String(spartito.tipo_spartito_codice),
        strumento_codice:
          spartito.strumento_codice != null
            ? String(spartito.strumento_codice)
            : NONE_VALUE,
        scaffale: spartito.scaffale ?? "",
        ripiano: spartito.ripiano ?? "",
        cartella: spartito.cartella ?? "",
        note: spartito.note ?? "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, spartito])

  const isSubmitting = createSpartito.isPending || updateSpartito.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!form.tipo_spartito_codice) {
      setError("Il tipo di spartito è obbligatorio.")
      return
    }

    const anno = form.anno.trim() === "" ? null : Number(form.anno)
    if (anno != null && Number.isNaN(anno)) {
      setError("L'anno deve essere un numero valido.")
      return
    }

    const payload = {
      titolo: form.titolo.trim(),
      autore: form.autore.trim() || null,
      anno,
      note: form.note.trim() || null,
      tipo_spartito_codice: Number(form.tipo_spartito_codice),
      strumento_codice:
        form.strumento_codice === NONE_VALUE
          ? null
          : Number(form.strumento_codice),
      scaffale: form.scaffale.trim() || null,
      ripiano: form.ripiano.trim() || null,
      cartella: form.cartella.trim() || null,
    }

    try {
      if (isEdit && spartito) {
        await updateSpartito.mutateAsync({ id: spartito.id, input: payload })
        toast({ title: "Spartito aggiornato" })
      } else {
        await createSpartito.mutateAsync(payload)
        toast({ title: "Spartito creato" })
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
            {isEdit ? "Modifica spartito" : "Nuovo spartito"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dati dello spartito."
              : "Inserisci i dati del nuovo spartito."}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="autore">Autore</Label>
              <Input
                id="autore"
                value={form.autore}
                onChange={(e) =>
                  setForm((f) => ({ ...f, autore: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anno">Anno</Label>
              <Input
                id="anno"
                type="number"
                value={form.anno}
                onChange={(e) =>
                  setForm((f) => ({ ...f, anno: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_spartito">Tipo spartito *</Label>
              <Select
                value={form.tipo_spartito_codice}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, tipo_spartito_codice: value }))
                }
              >
                <SelectTrigger id="tipo_spartito">
                  <SelectValue placeholder="Seleziona…" />
                </SelectTrigger>
                <SelectContent>
                  {tipiSpartito.data?.map((t) => (
                    <SelectItem key={t.codice} value={String(t.codice)}>
                      {t.descrizione}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="strumento">Strumento</Label>
              <Select
                value={form.strumento_codice}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, strumento_codice: value }))
                }
              >
                <SelectTrigger id="strumento">
                  <SelectValue placeholder="Seleziona…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Partitura completa</SelectItem>
                  {strumenti.data?.map((s) => (
                    <SelectItem key={s.codice} value={String(s.codice)}>
                      {s.descrizione}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="scaffale">Scaffale</Label>
              <Input
                id="scaffale"
                value={form.scaffale}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scaffale: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ripiano">Ripiano</Label>
              <Input
                id="ripiano"
                value={form.ripiano}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ripiano: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cartella">Cartella</Label>
              <Input
                id="cartella"
                value={form.cartella}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cartella: e.target.value }))
                }
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
