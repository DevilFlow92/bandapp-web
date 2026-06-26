import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useCreateEsterno, useUpdateEsterno } from "@/hooks/useEsterni"
import { useCreatePersona, useLookupStrumenti, useSearchPersone } from "@/hooks/useSoci"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Esterno, Persona } from "@/types/esterno"
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
import ComuneSelect from "@/components/ui/ComuneSelect"

const NONE_VALUE = "__none__"

type PersonaMode = "nuova" | "esistente"

interface EsternoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  esterno?: Esterno | null
}

interface DatiEsternoState {
  codice_esterno: string
  strumento_codice: string
  attivo: boolean
}

const emptyDatiEsterno: DatiEsternoState = {
  codice_esterno: "",
  strumento_codice: NONE_VALUE,
  attivo: true,
}

const emptyNuovaPersona = {
  nome: "",
  cognome: "",
  codice_fiscale: "",
  data_nascita: "",
  comune_nascita_codice: null as number | null,
}

export default function EsternoFormDialog({ open, onOpenChange, esterno }: EsternoFormDialogProps) {
  const isEdit = Boolean(esterno)
  const { toast } = useToast()
  const { banda } = useBanda()

  const createPersona = useCreatePersona()
  const createEsterno = useCreateEsterno()
  const updateEsterno = useUpdateEsterno()
  const strumenti = useLookupStrumenti()

  // Step 1 — persona (create mode only)
  const [personaMode, setPersonaMode] = useState<PersonaMode>("nuova")
  const [nuovaPersona, setNuovaPersona] = useState(emptyNuovaPersona)
  const [search, setSearch] = useState("")
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const personeResults = useSearchPersone(search)

  // Step 2 — dati esterno
  const [dati, setDati] = useState<DatiEsternoState>(emptyDatiEsterno)

  const [error, setError] = useState<string | null>(null)

  // Reset the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    setError(null)
    setPersonaMode("nuova")
    setNuovaPersona(emptyNuovaPersona)
    setSearch("")
    setSelectedPersona(null)
    if (esterno) {
      setDati({
        codice_esterno: esterno.codice_esterno,
        strumento_codice:
          esterno.strumento_codice != null ? String(esterno.strumento_codice) : NONE_VALUE,
        attivo: esterno.attivo,
      })
    } else {
      setDati(emptyDatiEsterno)
    }
  }, [open, esterno])

  const isSubmitting = createPersona.isPending || createEsterno.isPending || updateEsterno.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (dati.strumento_codice === NONE_VALUE) {
      setError("Strumento obbligatorio")
      return
    }
    const strumento_codice = Number(dati.strumento_codice)

    try {
      if (isEdit && esterno) {
        await updateEsterno.mutateAsync({
          id: esterno.id,
          input: {
            codice_esterno: dati.codice_esterno,
            strumento_codice,
            attivo: dati.attivo,
          },
        })
        toast({ title: "Esterno aggiornato" })
      } else {
        // Resolve the persona_id: either an existing selection or a new persona.
        let persona_id: number
        if (personaMode === "nuova") {
          if (!nuovaPersona.nome.trim() || !nuovaPersona.cognome.trim()) {
            setError("Nome e cognome sono obbligatori.")
            return
          }
          const persona = await createPersona.mutateAsync({
            nome: nuovaPersona.nome.trim(),
            cognome: nuovaPersona.cognome.trim(),
            codice_fiscale: nuovaPersona.codice_fiscale.trim() || null,
            data_nascita: nuovaPersona.data_nascita || null,
            comune_nascita_codice: nuovaPersona.comune_nascita_codice,
            banda_codice: banda!.codice,
          })
          persona_id = persona.id
        } else {
          if (!selectedPersona) {
            setError("Seleziona una persona esistente.")
            return
          }
          persona_id = selectedPersona.id
        }

        await createEsterno.mutateAsync({
          codice_esterno: dati.codice_esterno,
          strumento_codice,
          attivo: dati.attivo,
          persona_id,
          banda_codice: banda!.codice,
        })
        toast({ title: "Esterno creato" })
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
          <DialogTitle>{isEdit ? "Modifica esterno" : "Nuovo esterno"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dati dell'esterno."
              : "Inserisci una persona e i relativi dati di esterno."}
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

          {!isEdit && (
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold">Persona</legend>

              <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="persona-mode"
                    className="h-4 w-4"
                    checked={personaMode === "nuova"}
                    onChange={() => setPersonaMode("nuova")}
                  />
                  Nuova persona
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="persona-mode"
                    className="h-4 w-4"
                    checked={personaMode === "esistente"}
                    onChange={() => setPersonaMode("esistente")}
                  />
                  Persona esistente
                </label>
              </div>

              {personaMode === "nuova" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={nuovaPersona.nome}
                      onChange={(e) => setNuovaPersona((p) => ({ ...p, nome: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cognome">Cognome *</Label>
                    <Input
                      id="cognome"
                      value={nuovaPersona.cognome}
                      onChange={(e) =>
                        setNuovaPersona((p) => ({
                          ...p,
                          cognome: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codice_fiscale">Codice fiscale</Label>
                    <Input
                      id="codice_fiscale"
                      value={nuovaPersona.codice_fiscale}
                      onChange={(e) =>
                        setNuovaPersona((p) => ({
                          ...p,
                          codice_fiscale: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_nascita">Data di nascita</Label>
                    <Input
                      id="data_nascita"
                      type="date"
                      value={nuovaPersona.data_nascita}
                      onChange={(e) =>
                        setNuovaPersona((p) => ({
                          ...p,
                          data_nascita: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <ComuneSelect
                      value={nuovaPersona.comune_nascita_codice}
                      onChange={(codice) =>
                        setNuovaPersona((p) => ({
                          ...p,
                          comune_nascita_codice: codice,
                        }))
                      }
                      label="Comune di nascita"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="persona-search">Cerca persona</Label>
                  {selectedPersona ? (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>
                        {selectedPersona.nome} {selectedPersona.cognome}
                        {selectedPersona.codice_fiscale
                          ? ` — ${selectedPersona.codice_fiscale}`
                          : ""}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPersona(null)}
                      >
                        Cambia
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        id="persona-search"
                        placeholder="Digita almeno 2 caratteri…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search.trim().length >= 2 && (
                        <div className="max-h-48 overflow-y-auto rounded-md border">
                          {personeResults.isLoading ? (
                            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Ricerca in corso…
                            </div>
                          ) : personeResults.data && personeResults.data.length > 0 ? (
                            <ul className="divide-y">
                              {personeResults.data.map((persona) => (
                                <li key={persona.id}>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                                    onClick={() => {
                                      setSelectedPersona(persona)
                                      setSearch("")
                                    }}
                                  >
                                    {persona.nome} {persona.cognome}
                                    {persona.codice_fiscale ? ` — ${persona.codice_fiscale}` : ""}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Nessuna persona trovata
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </fieldset>
          )}

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Dati esterno</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codice_esterno">Codice esterno *</Label>
                <Input
                  id="codice_esterno"
                  required
                  value={dati.codice_esterno}
                  onChange={(e) => setDati((d) => ({ ...d, codice_esterno: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="strumento">Strumento *</Label>
                <Select
                  value={dati.strumento_codice}
                  onValueChange={(value) => setDati((d) => ({ ...d, strumento_codice: value }))}
                >
                  <SelectTrigger id="strumento">
                    <SelectValue placeholder="Seleziona…" />
                  </SelectTrigger>
                  <SelectContent>
                    {strumenti.data?.map((strumento) => (
                      <SelectItem key={strumento.codice} value={String(strumento.codice)}>
                        {strumento.descrizione}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={dati.attivo}
                onChange={(e) => setDati((d) => ({ ...d, attivo: e.target.checked }))}
              />
              Attivo
            </label>
          </fieldset>

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
