import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import { useCreatePersona, useSearchPersone } from "@/hooks/useSoci"
import { useCreateAllievo } from "@/hooks/useAllievi"
import { useLookupTipiIndirizzo } from "@/hooks/useIndirizzi"
import { usePersonaContatti } from "@/hooks/useContatti"
import api, { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Persona } from "@/types/allievo"
import type { CreateIndirizzoInput } from "@/types/indirizzo"
import type { Indirizzo } from "@/types/indirizzo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ComuneSelect from "@/components/ui/ComuneSelect"
import IndirizzoForm from "@/components/anagrafica/IndirizzoForm"
import ContattiSection from "@/components/anagrafica/ContattiSection"
import { cn } from "@/lib/utils"

type PersonaMode = "nuova" | "esistente"

const STEPS = ["Persona", "Indirizzo", "Contatti", "Dati allievo"] as const

const emptyNuovaPersona = {
  nome: "",
  cognome: "",
  codice_fiscale: "",
  data_nascita: "",
  comune_nascita_codice: null as number | null,
}

const emptyIndirizzo: CreateIndirizzoInput = {
  tipo_indirizzo_codice: 0,
  prima_riga: "",
  numero_civico: null,
  cap: null,
  comune_codice: null,
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  )
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((label, index) => {
        const step = index + 1
        const isDone = step < currentStep
        const isCurrent = step === currentStep
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium",
                isDone && "border-primary bg-primary text-primary-foreground",
                isCurrent && !isDone && "border-primary text-primary",
                !isDone && !isCurrent && "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : step}
            </span>
            <span
              className={cn(
                isCurrent ? "font-medium" : "text-muted-foreground",
                "hidden sm:inline",
              )}
            >
              {label}
            </span>
            {step < STEPS.length && <span className="mx-1 text-muted-foreground">—</span>}
          </li>
        )
      })}
    </ol>
  )
}

export default function AllievoWizardPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { banda } = useBanda()

  const [currentStep, setCurrentStep] = useState(1)

  // Persona identity, carried across steps.
  const [personaId, setPersonaId] = useState<number | null>(null)
  const [indirizzoId, setIndirizzoId] = useState<number | null>(null)
  const [indirizzoAdded, setIndirizzoAdded] = useState(false)

  // Step 1 — persona
  const [personaMode, setPersonaMode] = useState<PersonaMode>("nuova")
  const [nuovaPersona, setNuovaPersona] = useState(emptyNuovaPersona)
  const [search, setSearch] = useState("")
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const personeResults = useSearchPersone(search)
  const createPersona = useCreatePersona()
  const [error1, setError1] = useState<string | null>(null)

  // Step 2 — indirizzo (facoltativo: Allievo.indirizzo_id è nullable).
  const [indirizzo, setIndirizzo] = useState<CreateIndirizzoInput>(emptyIndirizzo)
  const tipiIndirizzo = useLookupTipiIndirizzo()
  const [isAddingIndirizzo, setIsAddingIndirizzo] = useState(false)
  const [error2, setError2] = useState<string | null>(null)

  // Step 3 — contatti (reuses ContattiSection as-is)
  const contatti = usePersonaContatti(personaId ?? 0, personaId != null)

  // Step 4 — dati allievo
  const createAllievo = useCreateAllievo()
  const [error4, setError4] = useState<string | null>(null)

  const handleSelectPersona = (persona: Persona) => {
    setSelectedPersona(persona)
    setSearch("")
    setPersonaId(persona.id)
    setCurrentStep(2)
  }

  const handleSubmitPersona = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError1(null)

    if (personaMode === "esistente") {
      if (!selectedPersona) {
        setError1("Seleziona una persona esistente.")
      }
      return
    }

    if (!nuovaPersona.nome.trim() || !nuovaPersona.cognome.trim()) {
      setError1("Nome e cognome sono obbligatori.")
      return
    }

    try {
      const persona = await createPersona.mutateAsync({
        nome: nuovaPersona.nome.trim(),
        cognome: nuovaPersona.cognome.trim(),
        codice_fiscale: nuovaPersona.codice_fiscale.trim() || null,
        data_nascita: nuovaPersona.data_nascita || null,
        comune_nascita_codice: nuovaPersona.comune_nascita_codice,
        banda_codice: banda!.codice,
      })
      setPersonaId(persona.id)
      toast({ title: "Persona creata" })
      setCurrentStep(2)
    } catch (err) {
      setError1(getErrorMessage(err))
    }
  }

  const handleSubmitIndirizzo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError2(null)

    if (!personaId) {
      setError2("Persona non definita.")
      return
    }
    if (!indirizzo.tipo_indirizzo_codice) {
      setError2("Seleziona il tipo di indirizzo.")
      return
    }
    if (!indirizzo.prima_riga.trim()) {
      setError2("La prima riga è obbligatoria.")
      return
    }

    setIsAddingIndirizzo(true)
    try {
      const { data: created } = await api.post<Indirizzo>("/indirizzi/", indirizzo)
      await api.put(`/persone/${personaId}/indirizzi/${created.id}`)
      setIndirizzoId(created.id)
      setIndirizzoAdded(true)
      toast({ title: "Indirizzo aggiunto" })
      setCurrentStep(3)
    } catch (err) {
      setError2(getErrorMessage(err))
    } finally {
      setIsAddingIndirizzo(false)
    }
  }

  const handleSubmitDatiAllievo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError4(null)

    if (!personaId) {
      setError4("Persona non definita.")
      return
    }

    try {
      await createAllievo.mutateAsync({
        persona_id: personaId,
        indirizzo_id: indirizzoId,
      })
      toast({ title: "Allievo creato" })
      navigate("/allievi")
    } catch (err) {
      setError4(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
        onClick={() => navigate("/allievi")}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Allievi
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuovo allievo</h1>
        <p className="text-sm text-muted-foreground">
          Crea la persona, i suoi indirizzi/contatti e i dati di allievo in un unico percorso
          guidato.
        </p>
      </div>

      <StepIndicator currentStep={currentStep} />

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Persona</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPersona} className="space-y-4">
              {error1 && <ErrorBanner message={error1} />}

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
                      onChange={(e) => setNuovaPersona((p) => ({ ...p, cognome: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codice_fiscale">Codice fiscale</Label>
                    <Input
                      id="codice_fiscale"
                      value={nuovaPersona.codice_fiscale}
                      onChange={(e) =>
                        setNuovaPersona((p) => ({ ...p, codice_fiscale: e.target.value }))
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
                        setNuovaPersona((p) => ({ ...p, data_nascita: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <ComuneSelect
                      value={nuovaPersona.comune_nascita_codice}
                      onChange={(codice) =>
                        setNuovaPersona((p) => ({ ...p, comune_nascita_codice: codice }))
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
                        onClick={() => {
                          setSelectedPersona(null)
                          setPersonaId(null)
                        }}
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
                                    onClick={() => handleSelectPersona(persona)}
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

              {personaMode === "nuova" && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={createPersona.isPending}>
                    {createPersona.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Avanti
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && personaId && (
        <Card>
          <CardHeader>
            <CardTitle>Indirizzo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitIndirizzo} className="space-y-4">
              {error2 && <ErrorBanner message={error2} />}

              <IndirizzoForm value={indirizzo} onChange={setIndirizzo} tipi={tipiIndirizzo.data} />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                  Salta questo step
                </Button>
                <Button type="submit" disabled={isAddingIndirizzo}>
                  {isAddingIndirizzo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salva e continua
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && personaId && (
        <div className="space-y-4">
          <ContattiSection personaId={personaId} canWrite={true} />
          <div className="flex justify-end">
            <Button type="button" onClick={() => setCurrentStep(4)}>
              Continua
            </Button>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Dati allievo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitDatiAllievo} className="space-y-4">
              {error4 && <ErrorBanner message={error4} />}

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground">Indirizzo</dt>
                  <dd>{indirizzoAdded ? "Aggiunto" : "Non aggiunto"}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground">Contatti</dt>
                  <dd>{contatti.data?.length ?? 0}</dd>
                </div>
              </dl>

              <div className="flex justify-end">
                <Button type="submit" disabled={createAllievo.isPending}>
                  {createAllievo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea allievo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
