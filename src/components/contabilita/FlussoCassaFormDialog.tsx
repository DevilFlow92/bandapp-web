import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  useCreateFlussoCassa,
  useLookupNatureFlusso,
  useUpdateFlussoCassa,
} from "@/hooks/useFlussiCassa"
import { useLookupVociContabilita } from "@/hooks/useConfigurazioneAnno"
import { useBanda } from "@/context/BandaContext"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { FlussoCassa } from "@/types/flusso-cassa"
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

interface FlussoCassaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flusso?: FlussoCassa | null
}

interface FormState {
  data_registrazione: string
  descrizione_operazione: string
  voce_contabilita_id: string
  natura_flusso_codice: string
  segno: string
  importo: string
  note: string
}

function nowDatetimeLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function emptyForm(): FormState {
  return {
    data_registrazione: nowDatetimeLocal(),
    descrizione_operazione: "",
    voce_contabilita_id: "",
    natura_flusso_codice: "",
    segno: "+",
    importo: "",
    note: "",
  }
}

export default function FlussoCassaFormDialog({
  open,
  onOpenChange,
  flusso,
}: FlussoCassaFormDialogProps) {
  const isEdit = Boolean(flusso)
  const isAutoIscrizione = flusso?.tipo === "AUTO_ISCRIZIONE"
  const isTrasferimento = Boolean(flusso?.trasferimento_id)
  const isReadOnly = isAutoIscrizione || isTrasferimento

  const { banda } = useBanda()
  const { toast } = useToast()

  const createFlusso = useCreateFlussoCassa()
  const updateFlusso = useUpdateFlussoCassa()
  const voci = useLookupVociContabilita(banda?.codice ?? 0, open && !!banda)
  const nature = useLookupNatureFlusso()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const vociList = voci.data ?? []
  const natureList = nature.data ?? []

  useEffect(() => {
    if (!open) return
    setError(null)
    if (flusso) {
      setForm({
        data_registrazione: flusso.data_registrazione.slice(0, 16),
        descrizione_operazione: flusso.descrizione_operazione,
        voce_contabilita_id: String(flusso.voce_contabilita_id),
        natura_flusso_codice: String(flusso.natura_flusso_codice),
        segno: flusso.segno,
        importo: flusso.importo,
        note: flusso.note ?? "",
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, flusso])

  useEffect(() => {
    if (isEdit) return
    if (!form.voce_contabilita_id) return
    const voce = vociList.find((v) => String(v.id) === form.voce_contabilita_id)
    if (!voce) return
    if (voce.sezione_rendiconto_codice === 1) {
      setForm((f) => ({ ...f, segno: "-" }))
    } else if (voce.sezione_rendiconto_codice === 2) {
      setForm((f) => ({ ...f, segno: "+" }))
    }
  }, [form.voce_contabilita_id, isEdit, vociList])

  const isSubmitting = createFlusso.isPending || updateFlusso.isPending

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!form.descrizione_operazione.trim()) {
      setError("La descrizione è obbligatoria.")
      return
    }
    if (!form.voce_contabilita_id) {
      setError("La voce contabilità è obbligatoria.")
      return
    }
    if (!form.natura_flusso_codice) {
      setError("La natura del flusso è obbligatoria.")
      return
    }
    const importoNum = parseFloat(form.importo)
    if (!form.importo || isNaN(importoNum) || importoNum <= 0) {
      setError("L'importo deve essere un valore positivo.")
      return
    }

    const payload = {
      voce_contabilita_id: Number(form.voce_contabilita_id),
      natura_flusso_codice: Number(form.natura_flusso_codice),
      data_registrazione: new Date(form.data_registrazione).toISOString(),
      descrizione_operazione: form.descrizione_operazione.trim(),
      note: form.note.trim() || null,
      importo: importoNum.toFixed(2),
      segno: form.segno as "+" | "-",
    }

    try {
      if (isEdit && flusso) {
        await updateFlusso.mutateAsync({ id: flusso.id, input: payload })
        toast({ title: "Movimento aggiornato" })
      } else {
        await createFlusso.mutateAsync(payload)
        toast({ title: "Movimento creato" })
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
          <DialogTitle>{isEdit ? "Modifica movimento" : "Nuovo movimento"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dati del movimento di cassa."
              : "Inserisci i dati del nuovo movimento di cassa."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isAutoIscrizione && (
            <div
              role="alert"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              Movimento generato automaticamente da un'iscrizione. Modificare l'iscrizione per
              aggiornarlo.
            </div>
          )}

          {isTrasferimento && !isAutoIscrizione && (
            <div
              role="alert"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              Trasferimento: eliminarlo e ricrearlo per modificarlo.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="data_registrazione">Data *</Label>
            <Input
              id="data_registrazione"
              type="datetime-local"
              value={form.data_registrazione}
              disabled={isReadOnly}
              onChange={(e) => setForm((f) => ({ ...f, data_registrazione: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descrizione_operazione">Descrizione *</Label>
            <Input
              id="descrizione_operazione"
              type="text"
              value={form.descrizione_operazione}
              disabled={isReadOnly}
              onChange={(e) => setForm((f) => ({ ...f, descrizione_operazione: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voce_contabilita_id">Voce contabilità *</Label>
            <Select
              value={form.voce_contabilita_id}
              disabled={isReadOnly}
              onValueChange={(v) => setForm((f) => ({ ...f, voce_contabilita_id: v }))}
            >
              <SelectTrigger id="voce_contabilita_id">
                <SelectValue placeholder="Seleziona…" />
              </SelectTrigger>
              <SelectContent>
                {vociList.map((voce) => (
                  <SelectItem key={voce.id} value={String(voce.id)}>
                    {voce.voce_contabilita}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="natura_flusso_codice">Natura flusso *</Label>
            <Select
              value={form.natura_flusso_codice}
              disabled={isReadOnly}
              onValueChange={(v) => setForm((f) => ({ ...f, natura_flusso_codice: v }))}
            >
              <SelectTrigger id="natura_flusso_codice">
                <SelectValue placeholder="Seleziona…" />
              </SelectTrigger>
              <SelectContent>
                {natureList.map((n) => (
                  <SelectItem key={n.codice} value={String(n.codice)}>
                    {n.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="segno">Tipo *</Label>
            <Select
              value={form.segno}
              disabled={isReadOnly}
              onValueChange={(v) => setForm((f) => ({ ...f, segno: v }))}
            >
              <SelectTrigger id="segno">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="+">+ Entrata</SelectItem>
                <SelectItem value="-">- Uscita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="importo">Importo (€) *</Label>
            <Input
              id="importo"
              type="number"
              step="0.01"
              min="0.01"
              value={form.importo}
              disabled={isReadOnly}
              onChange={(e) => setForm((f) => ({ ...f, importo: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <textarea
              id="note"
              rows={3}
              value={form.note}
              disabled={isReadOnly}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Facoltativo…"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {isReadOnly ? "Chiudi" : "Annulla"}
            </Button>
            {!isReadOnly && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Salva" : "Crea"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
