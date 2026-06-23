import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { isAxiosError } from "axios"
import { useCreateTrasferimento, useLookupNatureFlusso } from "@/hooks/useFlussiCassa"
import { useLookupVociContabilita } from "@/hooks/useConfigurazioneAnno"
import { useBanda } from "@/context/BandaContext"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
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

interface TrasferimentoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormState {
  data_registrazione: string
  descrizione_operazione: string
  voce_contabilita_id: string
  natura_da_codice: string
  natura_a_codice: string
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
    descrizione_operazione: "Versamento in banca",
    voce_contabilita_id: "",
    natura_da_codice: "",
    natura_a_codice: "",
    importo: "",
    note: "",
  }
}

export default function TrasferimentoFormDialog({
  open,
  onOpenChange,
}: TrasferimentoFormDialogProps) {
  const { banda } = useBanda()
  const { toast } = useToast()

  const createTrasferimento = useCreateTrasferimento()
  const voci = useLookupVociContabilita(banda?.codice ?? 0, open && !!banda)
  const nature = useLookupNatureFlusso()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(emptyForm())
  }, [open])

  const vociList = voci.data ?? []
  const natureList = nature.data ?? []

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
    if (!form.natura_da_codice) {
      setError("La natura di origine è obbligatoria.")
      return
    }
    if (!form.natura_a_codice) {
      setError("La natura di destinazione è obbligatoria.")
      return
    }
    const importoNum = parseFloat(form.importo)
    if (!form.importo || isNaN(importoNum) || importoNum <= 0) {
      setError("L'importo deve essere un valore positivo.")
      return
    }

    try {
      await createTrasferimento.mutateAsync({
        voce_contabilita_id: Number(form.voce_contabilita_id),
        natura_da_codice: Number(form.natura_da_codice),
        natura_a_codice: Number(form.natura_a_codice),
        importo: importoNum.toFixed(2),
        data_registrazione: new Date(form.data_registrazione).toISOString(),
        descrizione_operazione: form.descrizione_operazione.trim(),
        note: form.note.trim() || null,
      })
      toast({ title: "Trasferimento creato" })
      onOpenChange(false)
    } catch (err) {
      if (
        isAxiosError(err) &&
        err.response?.status === 422 &&
        typeof err.response.data?.detail === "string" &&
        err.response.data.detail.toLowerCase().includes("natura uguale")
      ) {
        setError("Origine e destinazione non possono essere uguali.")
        return
      }
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo trasferimento</DialogTitle>
          <DialogDescription>
            Registra un trasferimento di fondi tra cassa e banca.
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
            <Label htmlFor="t-data_registrazione">Data *</Label>
            <Input
              id="t-data_registrazione"
              type="datetime-local"
              value={form.data_registrazione}
              onChange={(e) => setForm((f) => ({ ...f, data_registrazione: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-descrizione_operazione">Descrizione *</Label>
            <Input
              id="t-descrizione_operazione"
              type="text"
              value={form.descrizione_operazione}
              onChange={(e) => setForm((f) => ({ ...f, descrizione_operazione: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-voce_contabilita_id">Voce contabilità *</Label>
            <Select
              value={form.voce_contabilita_id}
              onValueChange={(v) => setForm((f) => ({ ...f, voce_contabilita_id: v }))}
            >
              <SelectTrigger id="t-voce_contabilita_id">
                <SelectValue placeholder="Seleziona…" />
              </SelectTrigger>
              <SelectContent>
                {vociList.map((voce) => (
                  <SelectItem key={voce.id} value={String(voce.id)}>
                    {voce.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="t-natura_da_codice">Da (origine) *</Label>
              <Select
                value={form.natura_da_codice}
                onValueChange={(v) => setForm((f) => ({ ...f, natura_da_codice: v }))}
              >
                <SelectTrigger id="t-natura_da_codice">
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
              <Label htmlFor="t-natura_a_codice">A (destinazione) *</Label>
              <Select
                value={form.natura_a_codice}
                onValueChange={(v) => setForm((f) => ({ ...f, natura_a_codice: v }))}
              >
                <SelectTrigger id="t-natura_a_codice">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-importo">Importo (€) *</Label>
            <Input
              id="t-importo"
              type="number"
              step="0.01"
              min="0.01"
              value={form.importo}
              onChange={(e) => setForm((f) => ({ ...f, importo: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-note">Note</Label>
            <textarea
              id="t-note"
              rows={3}
              value={form.note}
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
              disabled={createTrasferimento.isPending}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={createTrasferimento.isPending}>
              {createTrasferimento.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
