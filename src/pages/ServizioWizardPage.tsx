import { useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Check, Loader2, Plus, Trash2 } from "lucide-react"
import {
  useCreateIndirizzo,
  useCreateServizio,
  useLookupTipiIndirizzo,
  useUpdateServizio,
} from "@/hooks/useServizi"
import { useOrganico } from "@/hooks/usePresenze"
import { useRicevute } from "@/hooks/useRicevute"
import { useRepertorio } from "@/hooks/useRepertorio"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Presenza } from "@/types/presenza"
import type { Ricevuta } from "@/types/ricevuta"
import type { RepertorioItem } from "@/types/repertorio"
import CommittentePicker from "@/components/committenti/CommittentePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import IndirizzoField, {
  emptyIndirizzoForm,
  resolveIndirizzoId,
  type IndirizzoFormState,
} from "@/components/indirizzi/IndirizzoField"
import AddPersonaOrganicoDialog from "@/components/attivita/AddPersonaOrganicoDialog"
import DeletePresenzaDialog from "@/components/attivita/DeletePresenzaDialog"
import AddBranoRepertorioDialog from "@/components/attivita/AddBranoRepertorioDialog"
import DeleteRepertorioItemDialog from "@/components/attivita/DeleteRepertorioItemDialog"
import RicevutaFormDialog from "@/components/ricevute/RicevutaFormDialog"
import DeleteRicevutaDialog from "@/components/ricevute/DeleteRicevutaDialog"
import { cn } from "@/lib/utils"

const CURRENT_YEAR = new Date().getFullYear()

const STEPS = ["Dati servizio", "Committente", "Organico", "Ricevute", "Repertorio"] as const

interface ServizioFormState {
  descrizione_servizio: string
  anno: string
  data_servizio: string
  note: string
}

const emptyForm: ServizioFormState = {
  descrizione_servizio: "",
  anno: String(CURRENT_YEAR),
  data_servizio: "",
  note: "",
}

interface CommittenteFormState {
  committente_id: number | null
  referente: string
  compenso_pattuito: string
}

const emptyCommittenteForm: CommittenteFormState = {
  committente_id: null,
  referente: "",
  compenso_pattuito: "",
}

function formatData(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function formatImporto(importo: number): string {
  return `€ ${importo.toFixed(2)}`
}

function personaInPresenzaLabel(presenza: Presenza): string {
  const { nome, cognome, ragione_sociale } = presenza.persona ?? {}
  return ragione_sociale || `${nome ?? ""} ${cognome ?? ""}`.trim() || "—"
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

export default function ServizioWizardPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { banda } = useBanda()

  const [currentStep, setCurrentStep] = useState(1)

  // Servizio identity, carried across steps and shown in the recap. The
  // servizio must exist before presenze/ricevute/repertorio can reference it,
  // so step 1 ends with a real POST /servizi/ — as in the Socio/Esterno
  // wizards, the following steps are optional enrichment of an already valid
  // entity, not part of one transaction.
  const [servizioId, setServizioId] = useState<number | null>(null)
  const [descrizioneCreata, setDescrizioneCreata] = useState("")

  // Step 1 — dati servizio + indirizzo
  const [form, setForm] = useState<ServizioFormState>(emptyForm)
  const [indirizzo, setIndirizzo] = useState<IndirizzoFormState>(emptyIndirizzoForm)
  const createServizio = useCreateServizio()
  const createIndirizzo = useCreateIndirizzo()
  const tipiIndirizzo = useLookupTipiIndirizzo()
  const [error1, setError1] = useState<string | null>(null)

  // Step 2 — committente, referente, compenso pattuito: PATCHed onto the
  // already-created servizio, not part of the POST in step 1.
  const [committenteForm, setCommittenteForm] = useState<CommittenteFormState>(emptyCommittenteForm)
  const updateServizio = useUpdateServizio()
  const [error2, setError2] = useState<string | null>(null)

  // Steps 3-5 operate on the created servizio; the queries stay disabled until
  // its id is known (useOrganico/useRepertorio/useRicevute guard on id > 0).
  const container = { servizioId: servizioId ?? 0 }
  const organicoQuery = useOrganico(container)
  const ricevuteQuery = useRicevute(servizioId ?? 0)
  const repertorioQuery = useRepertorio(container)

  const organico = useMemo(() => organicoQuery.data?.items ?? [], [organicoQuery.data])
  const ricevute = ricevuteQuery.data?.items ?? []
  const repertorio = useMemo(
    () => [...(repertorioQuery.data?.items ?? [])].sort((a, b) => a.ordine - b.ordine),
    [repertorioQuery.data],
  )

  // Step 3 — organico
  const [addTipo, setAddTipo] = useState<"socio" | "esterno" | null>(null)
  const [deletingPresenza, setDeletingPresenza] = useState<Presenza | null>(null)

  // Step 4 — ricevute, restricted to the people added to the organico above.
  const [ricevutaFormOpen, setRicevutaFormOpen] = useState(false)
  const [deletingRicevuta, setDeletingRicevuta] = useState<Ricevuta | null>(null)
  const personeCandidate = useMemo(
    () =>
      organico.map((presenza) => ({
        personaId: presenza.persona_id,
        label: personaInPresenzaLabel(presenza),
      })),
    [organico],
  )

  // Step 5 — repertorio
  const [addBranoOpen, setAddBranoOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<RepertorioItem | null>(null)
  const nextOrdine = repertorio.length > 0 ? Math.max(...repertorio.map((r) => r.ordine)) + 1 : 1

  const isSubmittingStep1 = createServizio.isPending || createIndirizzo.isPending

  const resetWizard = () => {
    setCurrentStep(1)
    setServizioId(null)
    setDescrizioneCreata("")
    setForm(emptyForm)
    setIndirizzo(emptyIndirizzoForm)
    setError1(null)
    setCommittenteForm(emptyCommittenteForm)
    setError2(null)
    setAddTipo(null)
    setDeletingPresenza(null)
    setRicevutaFormOpen(false)
    setDeletingRicevuta(null)
    setAddBranoOpen(false)
    setDeletingItem(null)
  }

  const handleSubmitServizio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError1(null)

    const anno = Number(form.anno)
    if (Number.isNaN(anno)) {
      setError1("L'anno deve essere un numero valido.")
      return
    }

    try {
      // Create an indirizzo inline only when address details were entered.
      const indirizzo_id = await resolveIndirizzoId(indirizzo, createIndirizzo.mutateAsync)

      const servizio = await createServizio.mutateAsync({
        banda_codice: banda!.codice,
        anno,
        descrizione_servizio: form.descrizione_servizio.trim(),
        data_servizio: form.data_servizio,
        indirizzo_id,
        note: form.note.trim() || null,
      })
      setServizioId(servizio.id)
      setDescrizioneCreata(servizio.descrizione_servizio)
      toast({ title: "Servizio creato" })
      setCurrentStep(2)
    } catch (err) {
      setError1(getErrorMessage(err))
    }
  }

  const handleSubmitCommittente = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError2(null)

    if (!servizioId) {
      setError2("Servizio non definito.")
      return
    }

    const compensoPattuito =
      committenteForm.compenso_pattuito.trim() === ""
        ? null
        : Number(committenteForm.compenso_pattuito)
    if (compensoPattuito !== null && Number.isNaN(compensoPattuito)) {
      setError2("Il compenso pattuito deve essere un numero valido.")
      return
    }

    try {
      await updateServizio.mutateAsync({
        id: servizioId,
        input: {
          committente_id: committenteForm.committente_id,
          referente: committenteForm.referente.trim() || null,
          compenso_pattuito: compensoPattuito,
        },
      })
      toast({ title: "Committente aggiornato" })
      setCurrentStep(3)
    } catch (err) {
      setError2(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
        onClick={() => navigate("/servizi")}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Servizi
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuovo servizio</h1>
        <p className="text-sm text-muted-foreground">
          Crea il servizio e componi organico, ricevute e repertorio in un unico percorso guidato.
        </p>
      </div>

      {currentStep <= STEPS.length && <StepIndicator currentStep={currentStep} />}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Dati servizio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitServizio} className="space-y-4">
              {error1 && <ErrorBanner message={error1} />}

              <div className="space-y-2">
                <Label htmlFor="descrizione_servizio">Descrizione *</Label>
                <Input
                  id="descrizione_servizio"
                  required
                  value={form.descrizione_servizio}
                  onChange={(e) => setForm((f) => ({ ...f, descrizione_servizio: e.target.value }))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="space-y-2">
                  <Label htmlFor="data_servizio">Data e ora *</Label>
                  <Input
                    id="data_servizio"
                    type="datetime-local"
                    required
                    value={form.data_servizio}
                    onChange={(e) => setForm((f) => ({ ...f, data_servizio: e.target.value }))}
                  />
                </div>
              </div>

              <fieldset className="space-y-4">
                <IndirizzoField
                  existingIndirizzoId={null}
                  existingIndirizzo={null}
                  value={indirizzo}
                  onChange={setIndirizzo}
                  tipiIndirizzo={tipiIndirizzo.data}
                />
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <textarea
                  id="note"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmittingStep1}>
                  {isSubmittingStep1 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea servizio
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && servizioId != null && (
        <Card>
          <CardHeader>
            <CardTitle>Committente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitCommittente} className="space-y-4">
              {error2 && <ErrorBanner message={error2} />}

              <div className="space-y-2">
                <Label>Committente</Label>
                <CommittentePicker
                  bandaCodice={banda!.codice}
                  value={committenteForm.committente_id}
                  onChange={(id) => setCommittenteForm((f) => ({ ...f, committente_id: id }))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="referente">Referente</Label>
                  <Input
                    id="referente"
                    value={committenteForm.referente}
                    onChange={(e) =>
                      setCommittenteForm((f) => ({ ...f, referente: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compenso_pattuito">Compenso pattuito (€)</Label>
                  <Input
                    id="compenso_pattuito"
                    type="number"
                    step="0.01"
                    value={committenteForm.compenso_pattuito}
                    onChange={(e) =>
                      setCommittenteForm((f) => ({ ...f, compenso_pattuito: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                  Salta questo step
                </Button>
                <Button type="submit" disabled={updateServizio.isPending}>
                  {updateServizio.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salva e continua
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && servizioId != null && (
        <Card>
          <CardHeader>
            <CardTitle>Organico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Aggiungi i soci e gli esterni che partecipano al servizio. Le presenze si registrano
              in seguito dalla lista servizi.
            </p>

            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setAddTipo("socio")}>
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi socio
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAddTipo("esterno")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi esterno
              </Button>
            </div>

            <div className="rounded-md border">
              {organicoQuery.isLoading ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Caricamento…
                </div>
              ) : organicoQuery.isError ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Errore nel caricamento dell'organico.
                </p>
              ) : organico.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Nessuna persona in organico
                </p>
              ) : (
                <ul className="divide-y">
                  {organico.map((presenza) => (
                    <li
                      key={presenza.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span>{personaInPresenzaLabel(presenza)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPresenza(presenza)}
                        aria-label="Rimuovi"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(4)}>
                Salta questo step
              </Button>
              <Button type="button" onClick={() => setCurrentStep(4)}>
                Continua
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && servizioId != null && (
        <Card>
          <CardHeader>
            <CardTitle>Ricevute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {organico.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna persona in organico: una ricevuta può essere intestata solo a chi è già
                stato aggiunto all'organico. Torna allo step precedente per aggiungere qualcuno,
                oppure salta questo step e aggiungi le ricevute in seguito dalla lista servizi.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Le ricevute possono essere intestate solo alle persone già presenti nell'organico di
                questo servizio.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRicevutaFormOpen(true)}
                disabled={organico.length === 0}
                title={
                  organico.length === 0
                    ? "Aggiungi prima almeno una persona all'organico"
                    : undefined
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi ricevuta
              </Button>
              {organico.length === 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setCurrentStep(3)}>
                  Torna all'organico
                </Button>
              )}
            </div>

            <div className="rounded-md border">
              {ricevuteQuery.isLoading ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Caricamento…
                </div>
              ) : ricevuteQuery.isError ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Errore nel caricamento delle ricevute.
                </p>
              ) : ricevute.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Nessuna ricevuta per questo servizio
                </p>
              ) : (
                <ul className="divide-y">
                  {ricevute.map((ricevuta) => (
                    <li
                      key={ricevuta.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span>
                        {ricevuta.persona
                          ? `${ricevuta.persona.nome ?? ""} ${ricevuta.persona.cognome ?? ""}`.trim() ||
                            "—"
                          : "—"}{" "}
                        — {formatImporto(ricevuta.importo)} — {formatData(ricevuta.data_ricevuta)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingRicevuta(ricevuta)}
                        aria-label="Elimina"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(5)}>
                Salta questo step
              </Button>
              <Button type="button" onClick={() => setCurrentStep(5)}>
                Continua
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 5 && servizioId != null && (
        <Card>
          <CardHeader>
            <CardTitle>Repertorio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Aggiungi i brani in programma. L'ordine può essere modificato in seguito dalla lista
              servizi.
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAddBranoOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi brano
              </Button>
            </div>

            <div className="rounded-md border">
              {repertorioQuery.isLoading ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Caricamento…
                </div>
              ) : repertorioQuery.isError ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Errore nel caricamento del repertorio.
                </p>
              ) : repertorio.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Nessun brano nel repertorio
                </p>
              ) : (
                <ul className="divide-y">
                  {repertorio.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span>
                        {item.ordine}. {item.nome_parte?.nome ?? "—"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingItem(item)}
                        aria-label="Rimuovi"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(6)}>
                Salta questo step
              </Button>
              <Button type="button" onClick={() => setCurrentStep(6)}>
                Continua
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Servizio creato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Descrizione</dt>
                <dd>{descrizioneCreata || "—"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Data</dt>
                <dd>{form.data_servizio ? formatData(form.data_servizio) : "—"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Organico</dt>
                <dd>{organico.length}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Ricevute</dt>
                <dd>{ricevute.length}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Repertorio</dt>
                <dd>{repertorio.length}</dd>
              </div>
            </dl>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetWizard}>
                Crea un altro servizio
              </Button>
              <Button type="button" onClick={() => navigate("/servizi")}>
                Vai alla lista servizi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {servizioId != null && (
        <>
          <AddPersonaOrganicoDialog
            container={{ servizioId }}
            tipo={addTipo ?? "socio"}
            open={addTipo !== null}
            onOpenChange={(open) => {
              if (!open) setAddTipo(null)
            }}
            existingPersonaIds={organico.map((p) => p.persona_id)}
          />
          <DeletePresenzaDialog
            open={deletingPresenza !== null}
            onOpenChange={(open) => {
              if (!open) setDeletingPresenza(null)
            }}
            presenza={deletingPresenza}
          />
          <RicevutaFormDialog
            servizioId={servizioId}
            open={ricevutaFormOpen}
            onOpenChange={setRicevutaFormOpen}
            personeCandidate={personeCandidate}
          />
          <DeleteRicevutaDialog
            open={deletingRicevuta !== null}
            onOpenChange={(open) => {
              if (!open) setDeletingRicevuta(null)
            }}
            ricevuta={deletingRicevuta}
          />
          <AddBranoRepertorioDialog
            container={{ servizioId }}
            nextOrdine={nextOrdine}
            open={addBranoOpen}
            onOpenChange={setAddBranoOpen}
            existingNomeParteIds={repertorio.map((r) => r.nome_parte_id)}
          />
          <DeleteRepertorioItemDialog
            open={deletingItem !== null}
            onOpenChange={(open) => {
              if (!open) setDeletingItem(null)
            }}
            item={deletingItem}
          />
        </>
      )}
    </div>
  )
}
