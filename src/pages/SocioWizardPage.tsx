import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import {
  useAllSoci,
  useCreatePersona,
  useCreateSocio,
  useLookupRuoliBanda,
  useLookupStrumenti,
  useSearchPersone,
} from "@/hooks/useSoci"
import { useAddPersonaIndirizzo, useLookupTipiIndirizzo } from "@/hooks/useIndirizzi"
import { usePersonaContatti } from "@/hooks/useContatti"
import { useCreateIscrizione, useLookupStatiIscrizione } from "@/hooks/useIscrizioni"
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
import type { Persona } from "@/types/socio"
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
import IscrizioneForm, {
  emptyIscrizioneForm,
  todayISO,
} from "@/components/iscrizioni/IscrizioneForm"
import EntitySelector from "@/components/modulistica/EntitySelector"
import TemplatePreviewPane from "@/components/modulistica/TemplatePreviewPane"
import { cn } from "@/lib/utils"

const NONE_VALUE = "__none__"

type PersonaMode = "nuova" | "esistente"

const STEPS = [
  "Persona",
  "Indirizzo",
  "Contatti",
  "Dati socio",
  "Iscrizione",
  "Genera documento",
] as const

const TEMPLATES_PAGE_SIZE = 50
const DEFAULT_TEMPLATE_NOME = "Modulo Iscrizione Associazione"

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

interface DatiSocioState {
  codice_socio: string
  data_ingresso: string
  strumento_codice: string
  ruolo_banda_codice: string
}

const emptyDatiSocio: DatiSocioState = {
  codice_socio: "",
  data_ingresso: "",
  strumento_codice: NONE_VALUE,
  // No "Nessuno" option in creation: the backend requires ruolo_banda_codice on POST /soci/.
  ruolo_banda_codice: "",
}

/**
 * Suggests the next codice_socio by taking the highest numeric suffix among
 * existing codes and incrementing it, preserving the prefix/padding of the
 * matching code (e.g. "S023" -> "S024"). Returns "" if nothing is parsable.
 */
function suggestNextCodiceSocio(codici: string[]): string {
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

export default function SocioWizardPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { banda } = useBanda()

  const [currentStep, setCurrentStep] = useState(1)

  // Persona identity, carried across steps and shown in the recap.
  const [personaId, setPersonaId] = useState<number | null>(null)
  const [personaNome, setPersonaNome] = useState("")
  const [personaCognome, setPersonaCognome] = useState("")
  const [indirizzoAdded, setIndirizzoAdded] = useState(false)
  const [socioId, setSocioId] = useState<number | null>(null)
  const [codiceSocio, setCodiceSocio] = useState("")

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

  // Step 4 — dati socio
  const [dati, setDati] = useState<DatiSocioState>(emptyDatiSocio)
  const [codicePrefilled, setCodicePrefilled] = useState(false)
  const strumenti = useLookupStrumenti()
  const ruoli = useLookupRuoliBanda()
  const createSocio = useCreateSocio()
  const allSoci = useAllSoci(banda!.codice, currentStep === 4)
  const [error4, setError4] = useState<string | null>(null)

  // Step 5 — iscrizione (optional)
  const [iscrizioneForm, setIscrizioneForm] = useState(emptyIscrizioneForm())
  const stati = useLookupStatiIscrizione()
  const createIscrizione = useCreateIscrizione()
  const [iscrizioneCreated, setIscrizioneCreated] = useState(false)
  const [iscrizioneId, setIscrizioneId] = useState<number | null>(null)
  const [iscrizioneAnno, setIscrizioneAnno] = useState<number | null>(null)
  const [error5, setError5] = useState<string | null>(null)

  // Step 6 — genera documento (optional)
  const templatesQuery = useTemplates(1, TEMPLATES_PAGE_SIZE)
  const templatesDisponibili = useMemo(
    () => (templatesQuery.data?.items ?? []).filter((t) => !t.entita_richieste.includes("esterno")),
    [templatesQuery.data],
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [defaultTemplateApplied, setDefaultTemplateApplied] = useState(false)
  const selectedTemplate = templatesDisponibili.find((t) => t.id === selectedTemplateId) ?? null
  const [docEntities, setDocEntities] = useState<Record<string, number>>({})
  const [documentoGenerato, setDocumentoGenerato] = useState<Documento | null>(null)
  const [documentoGeneratoTemplateNome, setDocumentoGeneratoTemplateNome] = useState<string | null>(
    null,
  )
  const [error6, setError6] = useState<string | null>(null)
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

  // Keeps docEntities in sync with the wizard's own context (socio/banda/iscrizione),
  // which may still be null when the template gets auto-selected at step 1 (before the
  // socio/iscrizione exist) — this backfills them as soon as they become available,
  // without touching entities the user picks manually (e.g. contatto, servizio).
  useEffect(() => {
    if (!selectedTemplate) return
    setDocEntities((prev) => {
      const next = { ...prev }
      let changed = false
      if (
        selectedTemplate.entita_richieste.includes("socio") &&
        socioId != null &&
        next.socio !== socioId
      ) {
        next.socio = socioId
        changed = true
      }
      if (selectedTemplate.entita_richieste.includes("banda") && next.banda !== banda!.codice) {
        next.banda = banda!.codice
        changed = true
      }
      if (
        selectedTemplate.entita_richieste.includes("iscrizione") &&
        iscrizioneId != null &&
        next.iscrizione !== iscrizioneId
      ) {
        next.iscrizione = iscrizioneId
        changed = true
      }
      return changed ? next : prev
    })
  }, [selectedTemplate, socioId, iscrizioneId, banda])

  useEffect(() => {
    if (defaultTemplateApplied || templatesQuery.isLoading || selectedTemplateId != null) return
    setDefaultTemplateApplied(true)
    const defaultTemplate = templatesDisponibili.find((t) => t.nome === DEFAULT_TEMPLATE_NOME)
    if (defaultTemplate) handleSelectTemplate(defaultTemplate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesDisponibili, defaultTemplateApplied, templatesQuery.isLoading, selectedTemplateId])

  const suggestedCodice = useMemo(() => {
    if (!allSoci.data) return ""
    return suggestNextCodiceSocio(allSoci.data.map((s) => s.codice_socio))
  }, [allSoci.data])

  useEffect(() => {
    if (currentStep === 4 && !codicePrefilled && suggestedCodice) {
      setCodicePrefilled(true)
      setDati((d) => ({ ...d, codice_socio: suggestedCodice }))
    }
  }, [currentStep, codicePrefilled, suggestedCodice])

  const resetWizard = () => {
    setCurrentStep(1)
    setPersonaId(null)
    setPersonaNome("")
    setPersonaCognome("")
    setIndirizzoAdded(false)
    setSocioId(null)
    setCodiceSocio("")
    setPersonaMode("nuova")
    setNuovaPersona(emptyNuovaPersona)
    setSearch("")
    setSelectedPersona(null)
    setError1(null)
    setIndirizzo(emptyIndirizzo)
    setError2(null)
    setDati(emptyDatiSocio)
    setCodicePrefilled(false)
    setError4(null)
    setIscrizioneForm(emptyIscrizioneForm())
    setIscrizioneCreated(false)
    setIscrizioneId(null)
    setIscrizioneAnno(null)
    setError5(null)
    setSelectedTemplateId(null)
    setDefaultTemplateApplied(false)
    setDocEntities({})
    setDocumentoGenerato(null)
    setDocumentoGeneratoTemplateNome(null)
    setError6(null)
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

  const handleSubmitDatiSocio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError4(null)

    if (!personaId) {
      setError4("Persona non definita.")
      return
    }

    if (!dati.ruolo_banda_codice) {
      setError4("Seleziona un ruolo in banda prima di continuare.")
      return
    }

    const strumento_codice =
      dati.strumento_codice === NONE_VALUE ? null : Number(dati.strumento_codice)
    const ruolo_banda_codice = Number(dati.ruolo_banda_codice)

    try {
      const socio = await createSocio.mutateAsync({
        codice_socio: dati.codice_socio,
        data_ingresso: dati.data_ingresso,
        strumento_codice,
        ruolo_banda_codice,
        persona_id: personaId,
      })
      setSocioId(socio.id)
      setCodiceSocio(socio.codice_socio)
      toast({ title: "Socio creato" })
      setIscrizioneForm((f) => ({ ...f, data_iscrizione: todayISO() }))
      setCurrentStep(5)
    } catch (err) {
      setError4(getErrorMessage(err))
    }
  }

  const handleSubmitIscrizione = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError5(null)

    if (!socioId) {
      setError5("Socio non definito.")
      return
    }
    if (!iscrizioneForm.stato_iscrizione_codice) {
      setError5("Seleziona uno stato iscrizione.")
      return
    }

    try {
      const iscrizione = await createIscrizione.mutateAsync({
        socio_id: socioId,
        anno: Number(iscrizioneForm.anno),
        data_iscrizione: iscrizioneForm.data_iscrizione,
        quota_partecipazione: Number(iscrizioneForm.quota_partecipazione),
        stato_iscrizione_codice: Number(iscrizioneForm.stato_iscrizione_codice),
        note: iscrizioneForm.note.trim() || null,
      })
      setIscrizioneCreated(true)
      setIscrizioneId(iscrizione.id)
      setIscrizioneAnno(iscrizione.anno)
      toast({ title: "Iscrizione creata" })
      setCurrentStep(6)
    } catch (err) {
      setError5(getErrorMessage(err))
    }
  }

  function handleSelectTemplate(template: Template) {
    const initial: Record<string, number> = {}
    if (template.entita_richieste.includes("socio") && socioId != null) {
      initial.socio = socioId
    }
    if (template.entita_richieste.includes("banda")) {
      initial.banda = banda!.codice
    }
    if (template.entita_richieste.includes("iscrizione") && iscrizioneId != null) {
      initial.iscrizione = iscrizioneId
    }
    setSelectedTemplateId(template.id)
    setDocEntities(initial)
    setDocumentoGenerato(null)
    setDocumentoGeneratoTemplateNome(null)
    setError6(null)
  }

  async function handleGenerateDocumento(kind: "docx" | "pdf") {
    if (!selectedTemplate) return
    setError6(null)
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
      setError6(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
        onClick={() => navigate("/soci")}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Soci
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuovo socio</h1>
        <p className="text-sm text-muted-foreground">
          Crea la persona, i suoi indirizzi/contatti e i dati di socio in un unico percorso guidato.
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
            <CardTitle>Dati socio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitDatiSocio} className="space-y-4">
              {error4 && <ErrorBanner message={error4} />}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="codice_socio">Codice socio *</Label>
                  <Input
                    id="codice_socio"
                    required
                    value={dati.codice_socio}
                    onChange={(e) => setDati((d) => ({ ...d, codice_socio: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_ingresso">Data di ingresso *</Label>
                  <Input
                    id="data_ingresso"
                    type="date"
                    required
                    value={dati.data_ingresso}
                    onChange={(e) => setDati((d) => ({ ...d, data_ingresso: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strumento">Strumento</Label>
                  <Select
                    value={dati.strumento_codice}
                    onValueChange={(value) => setDati((d) => ({ ...d, strumento_codice: value }))}
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
                  <Label htmlFor="ruolo">Ruolo in banda *</Label>
                  <Select
                    value={dati.ruolo_banda_codice}
                    onValueChange={(value) => setDati((d) => ({ ...d, ruolo_banda_codice: value }))}
                  >
                    <SelectTrigger id="ruolo">
                      <SelectValue placeholder="Seleziona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ruoli.data?.map((r) => (
                        <SelectItem key={r.codice} value={String(r.codice)}>
                          {r.descrizione}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={createSocio.isPending}>
                  {createSocio.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea socio
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Iscrizione</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitIscrizione} className="space-y-4">
              {error5 && <ErrorBanner message={error5} />}

              <IscrizioneForm
                value={iscrizioneForm}
                onChange={setIscrizioneForm}
                stati={stati.data}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(6)}>
                  Salta questo step
                </Button>
                <Button type="submit" disabled={createIscrizione.isPending}>
                  {createIscrizione.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea iscrizione
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Genera documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error6 && <ErrorBanner message={error6} />}

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
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(7)}>
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
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(7)}>
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
                      setError6(null)
                    }}
                  >
                    Cambia modulo
                  </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <EntitySelector
                      contenutoJson={selectedTemplate.contenuto_json}
                      value={docEntities}
                      onChange={setDocEntities}
                      readOnlyEntities={["socio", "banda"]}
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
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(7)}>
                    Salta questo step
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(7)}
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

      {currentStep === 7 && (
        <Card>
          <CardHeader>
            <CardTitle>Socio creato</CardTitle>
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
                <dt className="text-xs font-medium text-muted-foreground">Codice socio</dt>
                <dd>{codiceSocio || "—"}</dd>
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
                <dt className="text-xs font-medium text-muted-foreground">Iscrizione</dt>
                <dd>{iscrizioneCreated ? `Creata (anno ${iscrizioneAnno})` : "Non creata"}</dd>
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
                Crea un altro socio
              </Button>
              <Button type="button" onClick={() => navigate(`/soci/${socioId}`)}>
                Vai al dettaglio socio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
