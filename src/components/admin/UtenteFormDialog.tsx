import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useCreateUtente, useRuoli, useUpdateUtente } from "@/hooks/useAdmin"
import { useSoci, usePersona } from "@/hooks/useSoci"
import { useEsterni } from "@/hooks/useEsterni"
import { useAllievi } from "@/hooks/useAllievi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Utente } from "@/types/admin"
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

const RUOLI_PAGE_SIZE = 100

interface PersonaPreselezionata {
  personaId: number
  label: string
  tipo: "socio" | "esterno" | "allievo"
}

interface UtenteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  utente?: Utente | null
  /** Create mode only: preselects la persona, saltando la ricerca. */
  personaPreselezionata?: PersonaPreselezionata | null
}

interface UtenteFormState {
  email: string
  nome_completo: string
  tipo: "umano" | "servizio"
  password: string
  attivo: boolean
  superuser: boolean
  ruoli: number[]
}

interface SelectedPersona {
  personaId: number
  label: string
}

function personaLabel(
  persona: { nome: string; cognome: string } | null | undefined,
  codice: string,
): string {
  const nome = persona?.nome ?? ""
  const cognome = persona?.cognome ?? ""
  return `${nome} ${cognome} — ${codice}`.trim()
}

const emptyForm: UtenteFormState = {
  email: "",
  nome_completo: "",
  tipo: "umano",
  password: "",
  attivo: true,
  superuser: false,
  ruoli: [],
}

export default function UtenteFormDialog({
  open,
  onOpenChange,
  utente,
  personaPreselezionata,
}: UtenteFormDialogProps) {
  const isEdit = Boolean(utente)
  const { toast } = useToast()
  const { banda } = useBanda()

  const createUtente = useCreateUtente()
  const updateUtente = useUpdateUtente()
  const ruoli = useRuoli(1, RUOLI_PAGE_SIZE)

  const [form, setForm] = useState<UtenteFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  // Selezione Persona opzionale (card #22a, estesa da #166a), stesso pattern
  // toggle Socio/Esterno/Allievo + ricerca di IscrizioneCorsoFormDialog.
  const [tipo, setTipo] = useState<"socio" | "esterno" | "allievo">("socio")
  const [search, setSearch] = useState("")
  const [selectedPersona, setSelectedPersona] = useState<SelectedPersona | null>(null)
  const sociQuery = useSoci(1, 100, banda?.codice ?? 0, open && tipo === "socio" && !!banda)
  const esterniQuery = useEsterni(1, 100, banda?.codice ?? 0, open && tipo === "esterno" && !!banda)
  const allieviQuery = useAllievi(1, 100, banda?.codice ?? 0, open && tipo === "allievo" && !!banda)

  const personaAttualeQuery = usePersona(
    utente?.persona_id ?? 0,
    open && isEdit && utente?.persona_id != null,
  )

  useEffect(() => {
    if (!open) return
    setError(null)
    setSearch("")
    if (utente) {
      setTipo("socio")
      setForm({
        email: utente.email,
        nome_completo: utente.nome_completo ?? "",
        tipo: utente.tipo,
        password: "",
        attivo: utente.attivo,
        superuser: utente.superuser,
        ruoli: utente.ruoli.map((r) => r.id),
      })
      setSelectedPersona(null)
    } else if (personaPreselezionata) {
      setTipo(personaPreselezionata.tipo)
      setForm(emptyForm)
      setSelectedPersona({
        personaId: personaPreselezionata.personaId,
        label: personaPreselezionata.label,
      })
    } else {
      setTipo("socio")
      setForm(emptyForm)
      setSelectedPersona(null)
    }
  }, [open, utente, personaPreselezionata])

  useEffect(() => {
    if (!personaAttualeQuery.data) return
    const persona = personaAttualeQuery.data
    setSelectedPersona({
      personaId: persona.id,
      label: `${persona.nome} ${persona.cognome}`.trim(),
    })
  }, [personaAttualeQuery.data])

  const isLoadingRoster =
    tipo === "socio"
      ? sociQuery.isLoading
      : tipo === "esterno"
        ? esterniQuery.isLoading
        : allieviQuery.isLoading

  const options = useMemo(() => {
    if (tipo === "socio") {
      return (sociQuery.data?.items ?? []).map((s) => ({
        personaId: s.persona_id,
        label: personaLabel(s.persona, s.codice_socio),
      }))
    }
    if (tipo === "esterno") {
      return (esterniQuery.data?.items ?? []).map((e) => ({
        personaId: e.persona_id,
        label: personaLabel(e.persona, e.codice_esterno),
      }))
    }
    return (allieviQuery.data?.items ?? []).map((a) => ({
      personaId: a.persona_id,
      label: personaLabel(a.persona, a.codice_allievo),
    }))
  }, [tipo, sociQuery.data, esterniQuery.data, allieviQuery.data])

  const trimmedSearch = search.trim()
  const filteredOptions = useMemo(() => {
    const q = trimmedSearch.toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, trimmedSearch])

  const isSubmitting = createUtente.isPending || updateUtente.isPending
  const ruoliList = useMemo(() => ruoli.data?.items ?? [], [ruoli.data])

  const toggleRuolo = (id: number) => {
    setForm((f) => ({
      ...f,
      ruoli: f.ruoli.includes(id) ? f.ruoli.filter((r) => r !== id) : [...f.ruoli, id],
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      if (isEdit && utente) {
        await updateUtente.mutateAsync({
          id: utente.id,
          input: {
            nome_completo: form.nome_completo.trim() || null,
            persona_id: selectedPersona?.personaId ?? null,
            attivo: form.attivo,
            superuser: form.superuser,
            ruoli: form.ruoli,
          },
        })
        toast({ title: "Utente aggiornato" })
      } else {
        if (!form.email.trim()) {
          setError("L'email è obbligatoria.")
          return
        }
        if (form.tipo === "umano" && !form.password) {
          setError("La password è obbligatoria per gli utenti umani.")
          return
        }
        await createUtente.mutateAsync({
          email: form.email.trim(),
          nome_completo: form.nome_completo.trim() || null,
          persona_id: selectedPersona?.personaId ?? null,
          tipo: form.tipo,
          password: form.password || undefined,
          superuser: form.superuser,
          ruoli: form.ruoli,
        })
        toast({ title: "Utente creato" })
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
          <DialogTitle>{isEdit ? "Modifica utente" : "Nuovo utente"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Aggiorna i dati dell'utente." : "Inserisci i dati del nuovo utente."}
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
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              disabled={isEdit}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_completo">Nome completo</Label>
            <Input
              id="nome_completo"
              value={form.nome_completo}
              onChange={(e) => setForm((f) => ({ ...f, nome_completo: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Persona collegata</Label>
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
                  <Button
                    type="button"
                    size="sm"
                    variant={tipo === "allievo" ? "default" : "outline"}
                    onClick={() => {
                      setTipo("allievo")
                      setSearch("")
                    }}
                  >
                    Allievo
                  </Button>
                </div>
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
                      {tipo === "socio"
                        ? "Nessun socio trovato"
                        : tipo === "esterno"
                          ? "Nessun esterno trovato"
                          : "Nessun allievo trovato"}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {!isEdit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(value) =>
                    setForm((f) => ({
                      ...f,
                      tipo: value as "umano" | "servizio",
                    }))
                  }
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="umano">Umano</SelectItem>
                    <SelectItem value="servizio">Servizio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password {form.tipo === "umano" ? "*" : ""}</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  autoComplete="new-password"
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>
          )}

          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={form.attivo}
                onChange={(e) => setForm((f) => ({ ...f, attivo: e.target.checked }))}
              />
              Attivo
            </label>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={form.superuser}
              onChange={(e) => setForm((f) => ({ ...f, superuser: e.target.checked }))}
            />
            Superuser
          </label>

          <div className="space-y-2">
            <Label>Ruoli</Label>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-3">
              {ruoli.isLoading ? (
                <p className="text-sm text-muted-foreground">Caricamento…</p>
              ) : ruoliList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun ruolo disponibile</p>
              ) : (
                ruoliList.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={form.ruoli.includes(r.id)}
                      onChange={() => toggleRuolo(r.id)}
                    />
                    {r.nome}
                  </label>
                ))
              )}
            </div>
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
