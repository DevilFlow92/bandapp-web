import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useCreateRicevuta } from "@/hooks/useRicevute"
import { useSoci } from "@/hooks/useSoci"
import { useEsterni } from "@/hooks/useEsterni"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { TipoRicevuta } from "@/types/ricevuta"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface RicevutaPersonaOption {
  personaId: number
  label: string
}

interface RicevutaFormDialogProps {
  servizioId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * When provided, the persona picker is restricted to these people instead of
   * searching the whole anagrafica (used by the Servizio wizard, where a
   * ricevuta may only target someone already in the organico). The
   * socio/esterno toggle is hidden, since the list already mixes both.
   */
  personeCandidate?: RicevutaPersonaOption[]
}

interface FormState {
  importo: string
  data_ricevuta: string
  tipo_ricevuta: TipoRicevuta | "NONE"
  note_in_stampa: string
  note_fuori_stampa: string
}

interface SelectedPersona {
  personaId: number
  label: string
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
  tipo_ricevuta: "NONE",
  note_in_stampa: "",
  note_fuori_stampa: "",
}

function personaLabel(
  persona: { nome: string; cognome: string } | null | undefined,
  codice: string,
): string {
  const nome = persona?.nome ?? ""
  const cognome = persona?.cognome ?? ""
  return `${nome} ${cognome} — ${codice}`.trim()
}

export default function RicevutaFormDialog({
  servizioId,
  open,
  onOpenChange,
  personeCandidate,
}: RicevutaFormDialogProps) {
  const { toast } = useToast()
  const { banda } = useBanda()

  const createRicevuta = useCreateRicevuta()

  // Persona selection (optional): a ricevuta can be tied to a socio or an
  // esterno, both identified by persona_id. Soci and esterni have no text
  // search endpoint, so we fetch the banda's roster once and filter client-side,
  // mirroring the pattern used by AddPersonaOrganicoDialog for l'organico.
  // When personeCandidate is given the roster isn't fetched at all.
  const isRestricted = personeCandidate != null
  const [tipo, setTipo] = useState<"socio" | "esterno">("socio")
  const sociQuery = useSoci(
    1,
    100,
    banda?.codice ?? 0,
    open && !isRestricted && tipo === "socio" && !!banda,
  )
  const esterniQuery = useEsterni(
    1,
    100,
    banda?.codice ?? 0,
    open && !isRestricted && tipo === "esterno" && !!banda,
  )
  const [search, setSearch] = useState("")
  const [selectedPersona, setSelectedPersona] = useState<SelectedPersona | null>(null)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRoster = isRestricted
    ? false
    : tipo === "socio"
      ? sociQuery.isLoading
      : esterniQuery.isLoading

  const options = useMemo(() => {
    if (personeCandidate) return personeCandidate
    if (tipo === "socio") {
      return (sociQuery.data?.items ?? []).map((s) => ({
        personaId: s.persona_id,
        label: personaLabel(s.persona, s.codice_socio),
      }))
    }
    return (esterniQuery.data?.items ?? []).map((e) => ({
      personaId: e.persona_id,
      label: personaLabel(e.persona, e.codice_esterno),
    }))
  }, [personeCandidate, tipo, sociQuery.data, esterniQuery.data])

  const trimmedSearch = search.trim()
  const filteredOptions = useMemo(() => {
    const q = trimmedSearch.toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, trimmedSearch])

  // Reset the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    setError(null)
    setTipo("socio")
    setSearch("")
    setSelectedPersona(null)
    setForm({ ...emptyForm, data_ricevuta: nowLocal() })
  }, [open])

  const isSubmitting = createRicevuta.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      await createRicevuta.mutateAsync({
        servizio_id: servizioId,
        persona_id: selectedPersona?.personaId ?? null,
        tipo_ricevuta: form.tipo_ricevuta === "NONE" ? null : form.tipo_ricevuta,
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
            <Label>Persona</Label>
            {selectedPersona ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{selectedPersona.label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPersona(null)}
                >
                  Rimuovi
                </Button>
              </div>
            ) : (
              <>
                {isRestricted ? (
                  <p className="text-xs text-muted-foreground">
                    Solo le persone già presenti nell'organico di questo servizio.
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={tipo === "socio" ? "default" : "outline"}
                      onClick={() => {
                        setTipo("socio")
                        setSearch("")
                      }}
                    >
                      Socio
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={tipo === "esterno" ? "default" : "outline"}
                      onClick={() => {
                        setTipo("esterno")
                        setSearch("")
                      }}
                    >
                      Esterno
                    </Button>
                  </div>
                )}
                <Input
                  placeholder="Cerca per nome, cognome o codice…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {isLoadingRoster ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Caricamento…
                    </div>
                  ) : filteredOptions.length > 0 ? (
                    <ul className="divide-y">
                      {filteredOptions.map((option) => (
                        <li key={option.personaId}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                            onClick={() => {
                              setSelectedPersona(option)
                              setSearch("")
                            }}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {isRestricted
                        ? "Nessuna persona in organico"
                        : tipo === "socio"
                          ? "Nessun socio trovato"
                          : "Nessun esterno trovato"}
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
            <Label htmlFor="tipo_ricevuta">Tipo ricevuta</Label>
            <Select
              value={form.tipo_ricevuta}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, tipo_ricevuta: value as TipoRicevuta | "NONE" }))
              }
            >
              <SelectTrigger id="tipo_ricevuta">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Non specificato</SelectItem>
                <SelectItem value="PAGAMENTO">Pagamento</SelectItem>
                <SelectItem value="RISCOSSIONE">Riscossione</SelectItem>
              </SelectContent>
            </Select>
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
