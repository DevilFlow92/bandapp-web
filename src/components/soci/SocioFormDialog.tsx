import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  useCreatePersona,
  useCreateSocio,
  useLookupRuoliBanda,
  useLookupStrumenti,
  useSearchPersone,
  useUpdateSocio,
} from "@/hooks/useSoci"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Persona, Socio } from "@/types/socio"
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

interface SocioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  socio?: Socio | null
}

interface DatiSocioState {
  codice_socio: string
  data_ingresso: string
  attivo: boolean
  strumento_codice: string
  ruolo_banda_codice: string
}

const emptyDatiSocio: DatiSocioState = {
  codice_socio: "",
  data_ingresso: "",
  attivo: true,
  strumento_codice: NONE_VALUE,
  ruolo_banda_codice: NONE_VALUE,
}

const emptyNuovaPersona = {
  nome: "",
  cognome: "",
  codice_fiscale: "",
  data_nascita: "",
  comune_nascita_codice: null as number | null,
}

export default function SocioFormDialog({
  open,
  onOpenChange,
  socio,
}: SocioFormDialogProps) {
  const isEdit = Boolean(socio)
  const { toast } = useToast()
  const { banda } = useBanda()

  const createPersona = useCreatePersona()
  const createSocio = useCreateSocio()
  const updateSocio = useUpdateSocio()
  const strumenti = useLookupStrumenti()
  const ruoli = useLookupRuoliBanda()

  // Step 1 — persona (create mode only)
  const [personaMode, setPersonaMode] = useState<PersonaMode>("nuova")
  const [nuovaPersona, setNuovaPersona] = useState(emptyNuovaPersona)
  const [search, setSearch] = useState("")
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const personeResults = useSearchPersone(search)

  // Step 2 — dati socio
  const [dati, setDati] = useState<DatiSocioState>(emptyDatiSocio)

  const [error, setError] = useState<string | null>(null)

  // Reset the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    setError(null)
    setPersonaMode("nuova")
    setNuovaPersona(emptyNuovaPersona)
    setSearch("")
    setSelectedPersona(null)
    if (socio) {
      setDati({
        codice_socio: socio.codice_socio,
        data_ingresso: socio.data_ingresso?.slice(0, 10) ?? "",
        attivo: socio.attivo,
        strumento_codice:
          socio.strumento_codice != null
            ? String(socio.strumento_codice)
            : NONE_VALUE,
        ruolo_banda_codice:
          socio.ruolo_banda_codice != null
            ? String(socio.ruolo_banda_codice)
            : NONE_VALUE,
      })
    } else {
      setDati(emptyDatiSocio)
    }
  }, [open, socio])

  const isSubmitting =
    createPersona.isPending || createSocio.isPending || updateSocio.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const strumento_codice =
      dati.strumento_codice === NONE_VALUE
        ? null
        : Number(dati.strumento_codice)
    const ruolo_banda_codice =
      dati.ruolo_banda_codice === NONE_VALUE
        ? null
        : Number(dati.ruolo_banda_codice)

    try {
      if (isEdit && socio) {
        await updateSocio.mutateAsync({
          id: socio.id,
          input: {
            codice_socio: dati.codice_socio,
            data_ingresso: dati.data_ingresso,
            attivo: dati.attivo,
            strumento_codice,
            ruolo_banda_codice,
          },
        })
        toast({ title: "Socio aggiornato" })
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

        await createSocio.mutateAsync({
          codice_socio: dati.codice_socio,
          data_ingresso: dati.data_ingresso,
          attivo: dati.attivo,
          strumento_codice,
          ruolo_banda_codice,
          persona_id,
        })
        toast({ title: "Socio creato" })
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
          <DialogTitle>{isEdit ? "Modifica socio" : "Nuovo socio"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dati del socio."
              : "Inserisci una persona e i relativi dati di socio."}
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
                      onChange={(e) =>
                        setNuovaPersona((p) => ({ ...p, nome: e.target.value }))
                      }
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
                          ) : personeResults.data &&
                            personeResults.data.length > 0 ? (
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
                                    {persona.codice_fiscale
                                      ? ` — ${persona.codice_fiscale}`
                                      : ""}
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
            <legend className="text-sm font-semibold">Dati socio</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codice_socio">Codice socio *</Label>
                <Input
                  id="codice_socio"
                  required
                  value={dati.codice_socio}
                  onChange={(e) =>
                    setDati((d) => ({ ...d, codice_socio: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_ingresso">Data di ingresso *</Label>
                <Input
                  id="data_ingresso"
                  type="date"
                  required
                  value={dati.data_ingresso}
                  onChange={(e) =>
                    setDati((d) => ({ ...d, data_ingresso: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="strumento">Strumento</Label>
                <Select
                  value={dati.strumento_codice}
                  onValueChange={(value) =>
                    setDati((d) => ({ ...d, strumento_codice: value }))
                  }
                >
                  <SelectTrigger id="strumento">
                    <SelectValue placeholder="Seleziona…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Nessuno</SelectItem>
                    {strumenti.data?.map((s) => (
                      <SelectItem key={s.codice} value={String(s.codice)}>
                        {s.descrizione}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruolo">Ruolo in banda</Label>
                <Select
                  value={dati.ruolo_banda_codice}
                  onValueChange={(value) =>
                    setDati((d) => ({ ...d, ruolo_banda_codice: value }))
                  }
                >
                  <SelectTrigger id="ruolo">
                    <SelectValue placeholder="Seleziona…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Nessuno</SelectItem>
                    {ruoli.data?.map((r) => (
                      <SelectItem key={r.codice} value={String(r.codice)}>
                        {r.descrizione}
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
                onChange={(e) =>
                  setDati((d) => ({ ...d, attivo: e.target.checked }))
                }
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
