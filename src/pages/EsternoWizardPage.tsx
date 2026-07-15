import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import { useCreatePersona, useLookupStrumenti, useSearchPersone } from "@/hooks/useSoci"
import { useAllEsterni, useCreateEsterno } from "@/hooks/useEsterni"
import { useAddPersonaIndirizzo, useLookupTipiIndirizzo } from "@/hooks/useIndirizzi"
import { usePersonaContatti } from "@/hooks/useContatti"
import {
  useGenerateDocx,
  useGeneratePdf,
  usePreviewTemplate,
  useTemplates,
} from "@/hooks/useModulistica"
import { downloadDocumento, isPreviewable, previewDocumento } from "@/hooks/useDocumenti"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Persona } from "@/types/esterno"
import type { CreateIndirizzoInput } from "@/types/indirizzo"
import type { Template } from "@/types/modulistica"
import type { Documento } from "@/types/documento"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ComuneSelect from "@/components/ui/ComuneSelect"
import IndirizzoForm from "@/components/anagrafica/IndirizzoForm"
import ContattiSection from "@/components/anagrafica/ContattiSection"
import EntitySelector from "@/components/modulistica/EntitySelector"
import TemplatePreviewPane from "@/components/modulistica/TemplatePreviewPane"
import { cn } from "@/lib/utils"

type PersonaMode = "nuova" | "esistente"

const STEPS = ["Persona", "Indirizzo", "Contatti", "Dati esterno", "Genera documento"] as const

const TEMPLATES_PAGE_SIZE = 50

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

interface DatiEsternoState {
  codice_esterno: string
  strumento_codice: string
  attivo: boolean
}

const emptyDatiEsterno: DatiEsternoState = {
  codice_esterno: "",
  strumento_codice: "",
  attivo: true,
}

/**
 * Suggests the next codice_esterno by taking the highest numeric suffix among
 * existing codes and incrementing it, preserving the prefix/padding of the
 * matching code (e.g. "E023" -> "E024"). Returns "" if nothing is parsable.
 */
function suggestNextCodiceEsterno(codici: string[]): string {
  let maxNum = -1
  let bestCode = ""
  for (const codice of codici) {
    const match = codice.match(/(\d+)$/)
    if (!match) continue
    const num = Number(match[1])
    if (num > maxNum) {
      maxNum = num
      bestCode = codice
    }
  }
  if (maxNum < 0) return ""
  const match = bestCode.match(/(\d+)$/)!
  const digits = match[1]
  const prefix = bestCode.slice(0, bestCode.length - digits.length)
  const nextDigits = String(maxNum + 1).padStart(digits.length, "0")
  return prefix + nextDigits
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

export default function EsternoWizardPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { banda } = useBanda()

  const [currentStep, setCurrentStep] = useState(1)

  // Persona identity, carried across steps and shown in the recap.
  const [personaId, setPersonaId] = useState<number | null>(null)
  const [personaNome, setPersonaNome] = useState("")
  const [personaCognome, setPersonaCognome] = useState("")
  const [indirizzoAdded, setIndirizzoAdded] = useState(false)
  const [esternoId, setEsternoId] = useState<number | null>(null)
  const [codiceEsterno, setCodiceEsterno] = useState("")

  // Step 1 — persona
  const [personaMode, setPersonaMode] = useState<PersonaMode>("nuova")
  const [nuovaPersona, setNuovaPersona] = useState(emptyNuovaPersona)
  const [search, setSearch] = useState("")
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const personeResults = useSearchPersone(search)
  const createPersona = useCreatePersona()
  const [error1, setError1] = useState<string | null>(null)

  // Step 2 — indirizzo
  const [indirizzo, setIndirizzo] = useState<CreateIndirizzoInput>(emptyIndirizzo)
  const tipiIndirizzo = useLookupTipiIndirizzo()
  const addIndirizzo = useAddPersonaIndirizzo(personaId ?? 0)
  const [error2, setError2] = useState<string | null>(null)

  // Step 3 — contatti (reuses ContattiSection as-is)
  const contatti = usePersonaContatti(personaId ?? 0, personaId != null)

  // Step 4 — dati esterno
  const [dati, setDati] = useState<DatiEsternoState>(emptyDatiEsterno)
  const [codicePrefilled, setCodicePrefilled] = useState(false)
  const strumenti = useLookupStrumenti()
  const createEsterno = useCreateEsterno()
  const allEsterni = useAllEsterni(banda!.codice, currentStep === 4)
  const [error4, setError4] = useState<string | null>(null)

  // Step 5 — genera documento (optional)
  const templatesQuery = useTemplates(1, TEMPLATES_PAGE_SIZE)
  const templatesDisponibili = useMemo(
    () =>
      (templatesQuery.data?.items ?? []).filter(
        (t) => !t.entita_richieste.includes("socio") && !t.entita_richieste.includes("iscrizione"),
      ),
    [templatesQuery.data],
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const selectedTemplate = templatesDisponibili.find((t) => t.id === selectedTemplateId) ?? null
  const [docEntities, setDocEntities] = useState<Record<string, number>>({})
  const [documentoGenerato, setDocumentoGenerato] = useState<Documento | null>(null)
  const [documentoGeneratoTemplateNome, setDocumentoGeneratoTemplateNome] = useState<string | null>(
    null,
  )
  const [error5, setError5] = useState<string | null>(null)
  const previewTemplate = usePreviewTemplate()
  const generateDocx = useGenerateDocx()
  const generatePdf = useGeneratePdf()

  const isDocEntitiesComplete =
    !!selectedTemplate &&
    selectedTemplate.entita_richieste.length > 0 &&
    selectedTemplate.entita_richieste.every((entita) => docEntities[entita] != null)

  const previewMutateRef = useRef(previewTemplate.mutate)
  useEffect(() => {
    previewMutateRef.current = previewTemplate.mutate
  }, [previewTemplate.mutate])

  useEffect(() => {
    if (!selectedTemplate || !isDocEntitiesComplete) return
    previewMutateRef.current({
      id: selectedTemplate.id,
      contenuto_json: selectedTemplate.contenuto_json,
      entities: docEntities,
    })
  }, [selectedTemplate, docEntities, isDocEntitiesComplete])

  // Keeps docEntities in sync with the wizard's own context (esterno/banda), which
  // may still be null when the template gets selected before the esterno exists —
  // this backfills them as soon as they become available, without touching
  // entities the user picks manually (e.g. contatto).
  useEffect(() => {
    if (!selectedTemplate) return
    setDocEntities((prev) => {
      const next = { ...prev }
      let changed = false
      if (
        selectedTemplate.entita_richieste.includes("esterno") &&
        esternoId != null &&
        next.esterno !== esternoId
      ) {
        next.esterno = esternoId
        changed = true
      }
      if (selectedTemplate.entita_richieste.includes("banda") && next.banda !== banda!.codice) {
        next.banda = banda!.codice
        changed = true
      }
      return changed ? next : prev
    })
  }, [selectedTemplate, esternoId, banda])

  const suggestedCodice = useMemo(() => {
    if (!allEsterni.data) return ""
    return suggestNextCodiceEsterno(allEsterni.data.map((e) => e.codice_esterno))
  }, [allEsterni.data])

  useEffect(() => {
    if (currentStep === 4 && !codicePrefilled && suggestedCodice) {
      setCodicePrefilled(true)
      setDati((d) => ({ ...d, codice_esterno: suggestedCodice }))
    }
  }, [currentStep, codicePrefilled, suggestedCodice])

  const resetWizard = () => {
    setCurrentStep(1)
    setPersonaId(null)
    setPersonaNome("")
    setPersonaCognome("")
    setIndirizzoAdded(false)
    setEsternoId(null)
    setCodiceEsterno("")
    setPersonaMode("nuova")
    setNuovaPersona(emptyNuovaPersona)
    setSearch("")
    setSelectedPersona(null)
    setError1(null)
    setIndirizzo(emptyIndirizzo)
    setError2(null)
    setDati(emptyDatiEsterno)
    setCodicePrefilled(false)
    setError4(null)
    setSelectedTemplateId(null)
    setDocEntities({})
    setDocumentoGenerato(null)
    setDocumentoGeneratoTemplateNome(null)
    setError5(null)
  }

  const handleSelectPersona = (persona: Persona) => {
    setSelectedPersona(persona)
    setSearch("")
    setPersonaId(persona.id)
    setPersonaNome(persona.nome)
    setPersonaCognome(persona.cognome)
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
      setPersonaNome(persona.nome)
      setPersonaCognome(persona.cognome)
      toast({ title: "Persona creata" })
      setCurrentStep(2)
    } catch (err) {
      setError1(getErrorMessage(err))
    }
  }

  const handleSubmitIndirizzo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError2(null)

    if (!indirizzo.tipo_indirizzo_codice) {
      setError2("Seleziona il tipo di indirizzo.")
      return
    }
    if (!indirizzo.prima_riga.trim()) {
      setError2("La prima riga è obbligatoria.")
      return
    }

    try {
      await addIndirizzo.mutateAsync(indirizzo)
      setIndirizzoAdded(true)
      toast({ title: "Indirizzo aggiunto" })
      setCurrentStep(3)
    } catch (err) {
      setError2(getErrorMessage(err))
    }
  }

  const handleSubmitDatiEsterno = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError4(null)

    if (!personaId) {
      setError4("Persona non definita.")
      return
    }

    if (!dati.strumento_codice) {
      setError4("Seleziona uno strumento prima di continuare.")
      return
    }

    const strumento_codice = Number(dati.strumento_codice)

    try {
      const esterno = await createEsterno.mutateAsync({
        codice_esterno: dati.codice_esterno,
        strumento_codice,
        attivo: dati.attivo,
        persona_id: personaId,
        banda_codice: banda!.codice,
      })
      setEsternoId(esterno.id)
      setCodiceEsterno(esterno.codice_esterno)
      toast({ title: "Esterno creato" })
      setCurrentStep(5)
    } catch (err) {
      setError4(getErrorMessage(err))
    }
  }

  function handleSelectTemplate(template: Template) {
    const initial: Record<string, number> = {}
    if (template.entita_richieste.includes("esterno") && esternoId != null) {
      initial.esterno = esternoId
    }
    if (template.entita_richieste.includes("banda")) {
      initial.banda = banda!.codice
    }
    setSelectedTemplateId(template.id)
    setDocEntities(initial)
    setDocumentoGenerato(null)
    setDocumentoGeneratoTemplateNome(null)
    setError5(null)
  }

  async function handleGenerateDocumento(kind: "docx" | "pdf") {
    if (!selectedTemplate) return
    setError5(null)
    try {
      const mutateAsync = kind === "docx" ? generateDocx.mutateAsync : generatePdf.mutateAsync
      const documento = await mutateAsync({
        id: selectedTemplate.id,
        contenuto_json: selectedTemplate.contenuto_json,
        entities: docEntities,
      })
      setDocumentoGenerato(documento)
      setDocumentoGeneratoTemplateNome(selectedTemplate.nome)
      toast({ title: "Documento generato" })
    } catch (err) {
      setError5(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
        onClick={() => navigate("/esterni")}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Esterni
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuovo esterno</h1>
        <p className="text-sm text-muted-foreground">
          Crea la persona, i suoi indirizzi/contatti e i dati di esterno in un unico percorso
          guidato.
        </p>
      </div>

      {currentStep <= STEPS.length && <StepIndicator currentStep={currentStep} />}

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
                <Button type="submit" disabled={addIndirizzo.isPending}>
                  {addIndirizzo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <CardTitle>Dati esterno</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitDatiEsterno} className="space-y-4">
              {error4 && <ErrorBanner message={error4} />}

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
                      {strumenti.data?.map((s) => (
                        <SelectItem key={s.codice} value={String(s.codice)}>
                          {s.descrizione}
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

              <div className="flex justify-end">
                <Button type="submit" disabled={createEsterno.isPending}>
                  {createEsterno.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea esterno
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Genera documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error5 && <ErrorBanner message={error5} />}

            {!selectedTemplate ? (
              templatesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Caricamento moduli…
                </div>
              ) : templatesDisponibili.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Nessun modulo configurato per questo tipo di iscrizione.{" "}
                    <Link to="/modulistica" className="underline">
                      Vai a Modulistica
                    </Link>
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(6)}>
                      Salta questo step
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Modulo</Label>
                    <Select
                      value={selectedTemplateId != null ? String(selectedTemplateId) : undefined}
                      onValueChange={(value) => {
                        const template = templatesDisponibili.find((t) => t.id === Number(value))
                        if (template) handleSelectTemplate(template)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un modulo…" />
                      </SelectTrigger>
                      <SelectContent>
                        {templatesDisponibili.map((template) => (
                          <SelectItem key={template.id} value={String(template.id)}>
                            {template.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(6)}>
                      Salta questo step
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{selectedTemplate.nome}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplateId(null)
                      setDocumentoGenerato(null)
                      setDocumentoGeneratoTemplateNome(null)
                      setError5(null)
                    }}
                  >
                    Cambia modulo
                  </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <EntitySelector
                      entitaRichieste={selectedTemplate.entita_richieste}
                      value={docEntities}
                      onChange={setDocEntities}
                      readOnlyEntities={["esterno", "banda"]}
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleGenerateDocumento("docx")}
                        disabled={!isDocEntitiesComplete || generateDocx.isPending}
                      >
                        {generateDocx.isPending ? "Generazione..." : "Genera DOCX"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleGenerateDocumento("pdf")}
                        disabled={!isDocEntitiesComplete || generatePdf.isPending}
                      >
                        {generatePdf.isPending ? "Generazione..." : "Genera PDF"}
                      </Button>
                    </div>

                    {documentoGenerato && (
                      <div className="space-y-2 rounded-md border p-3 text-sm">
                        <p className="font-medium">Documento generato: {documentoGenerato.nome}</p>
                        <div className="flex gap-2">
                          {isPreviewable(documentoGenerato.mime_type) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => previewDocumento(documentoGenerato.id)}
                            >
                              Visualizza
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              downloadDocumento(documentoGenerato.id, documentoGenerato.nome)
                            }
                          >
                            Scarica
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <TemplatePreviewPane
                    html={previewTemplate.data?.html}
                    isLoading={previewTemplate.isPending}
                    error={previewTemplate.isError ? getErrorMessage(previewTemplate.error) : null}
                    isReady={isDocEntitiesComplete}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(6)}>
                    Salta questo step
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(6)}
                    disabled={!documentoGenerato}
                  >
                    Avanti
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Esterno creato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Nome</dt>
                <dd>{personaNome || "—"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Cognome</dt>
                <dd>{personaCognome || "—"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Codice esterno</dt>
                <dd>{codiceEsterno || "—"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Indirizzo</dt>
                <dd>{indirizzoAdded ? "Aggiunto" : "Non aggiunto"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Contatti</dt>
                <dd>{contatti.data?.length ?? 0}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Documento</dt>
                <dd>
                  {documentoGenerato
                    ? `Generato (${documentoGeneratoTemplateNome} — ${documentoGenerato.nome})`
                    : "Non generato"}
                </dd>
              </div>
            </dl>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetWizard}>
                Crea un altro esterno
              </Button>
              <Button type="button" onClick={() => navigate("/esterni")}>
                Vai alla lista esterni
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
