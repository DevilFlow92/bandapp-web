import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useCreateRicevuta } from "@/hooks/useRicevute"
import { useEsterni } from "@/hooks/useEsterni"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Esterno } from "@/types/esterno"
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

interface RicevutaFormDialogProps {
  servizioId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormState {
  importo: string
  data_ricevuta: string
  note_in_stampa: string
  note_fuori_stampa: string
}

/** Current local time formatted for a datetime-local input ("YYYY-MM-DDTHH:MM"). */
function nowLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

const emptyForm: FormState = {
  importo: "",
  data_ricevuta: "",
  note_in_stampa: "",
  note_fuori_stampa: "",
}

function esternoLabel(esterno: Esterno): string {
  const nome = esterno.persona?.nome ?? ""
  const cognome = esterno.persona?.cognome ?? ""
  return `${nome} ${cognome} — ${esterno.codice_esterno}`.trim()
}

export default function RicevutaFormDialog({
  servizioId,
  open,
  onOpenChange,
}: RicevutaFormDialogProps) {
  const { toast } = useToast()
  const { banda } = useBanda()

  const createRicevuta = useCreateRicevuta()

  // Esterno selection (optional). The esterni endpoint has no text search, so we
  // fetch the banda's esterni once and filter them client-side.
  const esterniQuery = useEsterni(1, 50, banda?.codice ?? 0, open && !!banda)
  const [search, setSearch] = useState("")
  const [selectedEsterno, setSelectedEsterno] = useState<Esterno | null>(null)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const filteredEsterni = useMemo(() => {
    const items = esterniQuery.data?.items ?? []
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((e) => {
      const full = `${e.persona?.nome ?? ""} ${e.persona?.cognome ?? ""} ${e.codice_esterno}`
        .trim()
        .toLowerCase()
      return full.includes(q)
    })
  }, [esterniQuery.data, search])

  // Reset the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    setError(null)
    setSearch("")
    setSelectedEsterno(null)
    setForm({ ...emptyForm, data_ricevuta: nowLocal() })
  }, [open])

  const isSubmitting = createRicevuta.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      await createRicevuta.mutateAsync({
        servizio_id: servizioId,
        esterno_id: selectedEsterno?.id ?? null,
        importo: Number(form.importo),
        data_ricevuta: new Date(form.data_ricevuta).toISOString(),
        note_in_stampa: form.note_in_stampa.trim() || null,
        note_fuori_stampa: form.note_fuori_stampa.trim() || null,
      })
      toast({ title: "Ricevuta creata" })
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova ricevuta</DialogTitle>
          <DialogDescription>
            Inserisci i dati della ricevuta per questo servizio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="esterno">Esterno</Label>
            {selectedEsterno ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{esternoLabel(selectedEsterno)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEsterno(null)}
                >
                  Rimuovi
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="esterno"
                  placeholder="Cerca per nome, cognome o codice…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {esterniQuery.isLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Caricamento…
                    </div>
                  ) : filteredEsterni.length > 0 ? (
                    <ul className="divide-y">
                      {filteredEsterni.map((esterno) => (
                        <li key={esterno.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                            onClick={() => {
                              setSelectedEsterno(esterno)
                              setSearch("")
                            }}
                          >
                            {esternoLabel(esterno)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nessun esterno trovato
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="importo">Importo *</Label>
              <Input
                id="importo"
                type="number"
                step="0.01"
                required
                value={form.importo}
                onChange={(e) => setForm((f) => ({ ...f, importo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_ricevuta">Data ricevuta *</Label>
              <Input
                id="data_ricevuta"
                type="datetime-local"
                required
                value={form.data_ricevuta}
                onChange={(e) => setForm((f) => ({ ...f, data_ricevuta: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note_in_stampa">Note in stampa</Label>
            <textarea
              id="note_in_stampa"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.note_in_stampa}
              onChange={(e) => setForm((f) => ({ ...f, note_in_stampa: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note_fuori_stampa">Note fuori stampa</Label>
            <textarea
              id="note_fuori_stampa"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.note_fuori_stampa}
              onChange={(e) => setForm((f) => ({ ...f, note_fuori_stampa: e.target.value }))}
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
              Crea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
