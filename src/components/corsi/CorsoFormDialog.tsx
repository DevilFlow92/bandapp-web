import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useCreateCorso, useUpdateCorso, useLookupTipiCorso } from "@/hooks/useCorsi"
import { useSoci } from "@/hooks/useSoci"
import { useEsterni } from "@/hooks/useEsterni"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Corso } from "@/types/corso"
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

interface FormState {
  tipo_corso_codice: string
  anno: string
  coordinatore_persona_id: number | null
  insegnante_persona_id: number | null
  note: string
}

interface CorsoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  corso?: Corso | null
}

function personaLabel(
  persona: { nome: string; cognome: string } | null | undefined,
  codice: string,
): string {
  const nome = persona?.nome ?? ""
  const cognome = persona?.cognome ?? ""
  return `${nome} ${cognome} — ${codice}`.trim()
}

const emptyForm: FormState = {
  tipo_corso_codice: "",
  anno: new Date().getFullYear().toString(),
  coordinatore_persona_id: null,
  insegnante_persona_id: null,
  note: "",
}

export default function CorsoFormDialog({ open, onOpenChange, corso }: CorsoFormDialogProps) {
  const { toast } = useToast()
  const { banda } = useBanda()

  const createCorso = useCreateCorso()
  const updateCorso = useUpdateCorso()

  const { data: tipiCorso, isLoading: isLoadingTipi } = useLookupTipiCorso()

  // Persona selection: coordinatore and insegnante can be socio or esterno.
  // Load both soci and esterni when dialog is open.
  const [tipoCoordinatore, setTipoCoordinatore] = useState<"socio" | "esterno">("socio")
  const [tipoInsegnante, setTipoInsegnante] = useState<"socio" | "esterno">("socio")

  const sociQuery = useSoci(1, 100, banda?.codice ?? 0, open && !!banda)
  const esterniQuery = useEsterni(1, 100, banda?.codice ?? 0, open && !!banda)

  const [searchCoordinatore, setSearchCoordinatore] = useState("")
  const [searchInsegnante, setSearchInsegnante] = useState("")

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  // Compute persona options for coordinatore
  const coordinatoreOptions = useMemo(() => {
    if (tipoCoordinatore === "socio") {
      return (sociQuery.data?.items ?? []).map((s) => ({
        personaId: s.persona_id,
        label: personaLabel(s.persona, s.codice_socio),
      }))
    }
    return (esterniQuery.data?.items ?? []).map((e) => ({
      personaId: e.persona_id,
      label: personaLabel(e.persona, e.codice_esterno),
    }))
  }, [tipoCoordinatore, sociQuery.data, esterniQuery.data])

  // Compute persona options for insegnante
  const insegnanteOptions = useMemo(() => {
    if (tipoInsegnante === "socio") {
      return (sociQuery.data?.items ?? []).map((s) => ({
        personaId: s.persona_id,
        label: personaLabel(s.persona, s.codice_socio),
      }))
    }
    return (esterniQuery.data?.items ?? []).map((e) => ({
      personaId: e.persona_id,
      label: personaLabel(e.persona, e.codice_esterno),
    }))
  }, [tipoInsegnante, sociQuery.data, esterniQuery.data])

  const filteredCoordinatore = useMemo(() => {
    const q = searchCoordinatore.trim().toLowerCase()
    if (!q) return coordinatoreOptions
    return coordinatoreOptions.filter((o) => o.label.toLowerCase().includes(q))
  }, [coordinatoreOptions, searchCoordinatore])

  const filteredInsegnante = useMemo(() => {
    const q = searchInsegnante.trim().toLowerCase()
    if (!q) return insegnanteOptions
    return insegnanteOptions.filter((o) => o.label.toLowerCase().includes(q))
  }, [insegnanteOptions, searchInsegnante])

  const coordinatoreLabelText = useMemo(() => {
    if (!form.coordinatore_persona_id) return null
    const allOptions = [...coordinatoreOptions, ...insegnanteOptions]
    return allOptions.find((o) => o.personaId === form.coordinatore_persona_id)?.label ?? null
  }, [form.coordinatore_persona_id, coordinatoreOptions, insegnanteOptions])

  const insegnanteLabelText = useMemo(() => {
    if (!form.insegnante_persona_id) return null
    const allOptions = [...coordinatoreOptions, ...insegnanteOptions]
    return allOptions.find((o) => o.personaId === form.insegnante_persona_id)?.label ?? null
  }, [form.insegnante_persona_id, coordinatoreOptions, insegnanteOptions])

  // Reset form whenever dialog opens
  useEffect(() => {
    if (!open) return
    setError(null)
    if (corso) {
      setForm({
        tipo_corso_codice: corso.tipo_corso_codice.toString(),
        anno: corso.anno.toString(),
        coordinatore_persona_id: corso.coordinatore_persona_id,
        insegnante_persona_id: corso.insegnante_persona_id,
        note: corso.note ?? "",
      })
    } else {
      setForm(emptyForm)
    }
    setTipoCoordinatore("socio")
    setTipoInsegnante("socio")
    setSearchCoordinatore("")
    setSearchInsegnante("")
  }, [open, corso])

  const isSubmitting = createCorso.isPending || updateCorso.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      const input = {
        banda_codice: banda!.codice,
        tipo_corso_codice: parseInt(form.tipo_corso_codice, 10),
        anno: parseInt(form.anno, 10),
        coordinatore_persona_id: form.coordinatore_persona_id,
        insegnante_persona_id: form.insegnante_persona_id,
        note: form.note.trim() || null,
      }

      if (corso) {
        await updateCorso.mutateAsync({ id: corso.id, input })
        toast({ title: "Corso aggiornato" })
      } else {
        await createCorso.mutateAsync(input)
        toast({ title: "Corso creato" })
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
          <DialogTitle>{corso ? "Modifica corso" : "Nuovo corso"}</DialogTitle>
          <DialogDescription>
            {corso ? "Aggiorna i dati del corso." : "Crea un nuovo corso musicale."}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tipo_corso_codice">Tipo corso *</Label>
              <Select
                value={form.tipo_corso_codice}
                onValueChange={(value) => setForm((f) => ({ ...f, tipo_corso_codice: value }))}
              >
                <SelectTrigger id="tipo_corso_codice" disabled={isLoadingTipi}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTipi ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Caricamento…</div>
                  ) : (
                    (tipiCorso ?? []).map((tipo) => (
                      <SelectItem key={tipo.codice} value={tipo.codice.toString()}>
                        {tipo.descrizione}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anno">Anno *</Label>
              <Input
                id="anno"
                type="number"
                required
                value={form.anno}
                onChange={(e) => setForm((f) => ({ ...f, anno: e.target.value }))}
              />
            </div>
          </div>

          {/* Coordinatore selection */}
          <div className="space-y-2">
            <Label>Coordinatore</Label>
            {form.coordinatore_persona_id && coordinatoreLabelText ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{coordinatoreLabelText}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, coordinatore_persona_id: null }))}
                >
                  Rimuovi
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoCoordinatore === "socio" ? "default" : "outline"}
                    onClick={() => {
                      setTipoCoordinatore("socio")
                      setSearchCoordinatore("")
                    }}
                  >
                    Socio
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoCoordinatore === "esterno" ? "default" : "outline"}
                    onClick={() => {
                      setTipoCoordinatore("esterno")
                      setSearchCoordinatore("")
                    }}
                  >
                    Esterno
                  </Button>
                </div>
                <Input
                  placeholder="Cerca coordinatore…"
                  value={searchCoordinatore}
                  onChange={(e) => setSearchCoordinatore(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {sociQuery.isLoading || esterniQuery.isLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Caricamento…
                    </div>
                  ) : filteredCoordinatore.length > 0 ? (
                    <ul className="divide-y">
                      {filteredCoordinatore.map((option) => (
                        <li key={option.personaId}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                coordinatore_persona_id: option.personaId,
                              }))
                              setSearchCoordinatore("")
                            }}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nessuno trovato</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Insegnante selection */}
          <div className="space-y-2">
            <Label>Insegnante</Label>
            {form.insegnante_persona_id && insegnanteLabelText ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{insegnanteLabelText}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, insegnante_persona_id: null }))}
                >
                  Rimuovi
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoInsegnante === "socio" ? "default" : "outline"}
                    onClick={() => {
                      setTipoInsegnante("socio")
                      setSearchInsegnante("")
                    }}
                  >
                    Socio
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoInsegnante === "esterno" ? "default" : "outline"}
                    onClick={() => {
                      setTipoInsegnante("esterno")
                      setSearchInsegnante("")
                    }}
                  >
                    Esterno
                  </Button>
                </div>
                <Input
                  placeholder="Cerca insegnante…"
                  value={searchInsegnante}
                  onChange={(e) => setSearchInsegnante(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {sociQuery.isLoading || esterniQuery.isLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Caricamento…
                    </div>
                  ) : filteredInsegnante.length > 0 ? (
                    <ul className="divide-y">
                      {filteredInsegnante.map((option) => (
                        <li key={option.personaId}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                insegnante_persona_id: option.personaId,
                              }))
                              setSearchInsegnante("")
                            }}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nessuno trovato</div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <textarea
              id="note"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Note sul corso…"
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
            <Button type="submit" disabled={isSubmitting || !form.tipo_corso_codice}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {corso ? "Aggiorna" : "Crea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
