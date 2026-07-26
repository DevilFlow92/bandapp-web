import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import { useCreateProva } from "@/hooks/useProve"
import { useCreateIndirizzo, useLookupTipiIndirizzo } from "@/hooks/useServizi"
import { useOrganico } from "@/hooks/usePresenze"
import { useRepertorio } from "@/hooks/useRepertorio"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import ServizioPicker from "@/components/prove/ServizioPicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import IndirizzoField, {
  emptyIndirizzoForm,
  resolveIndirizzoId,
  type IndirizzoFormState,
} from "@/components/indirizzi/IndirizzoField"
import OrganicoWizardStep from "@/components/attivita/OrganicoWizardStep"
import RepertorioWizardStep from "@/components/attivita/RepertorioWizardStep"
import { cn } from "@/lib/utils"

const STEPS = ["Dati prova", "Organico", "Repertorio"] as const

interface ProvaFormState {
  data_prova: string
  servizio_id: number | null
  note: string
}

const emptyForm: ProvaFormState = {
  data_prova: "",
  servizio_id: null,
  note: "",
}

/** Formats an ISO datetime string as "DD/MM/YYYY HH:MM". */
function formatDataProva(iso: string): string {
  const [datePart, timePart = ""] = iso.split("T")
  const [year, month, day] = datePart.split("-")
  if (!year || !month || !day) return iso
  const time = timePart.slice(0, 5)
  return time ? `${day}/${month}/${year} ${time}` : `${day}/${month}/${year}`
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

export default function ProvaWizardPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { banda } = useBanda()

  const [currentStep, setCurrentStep] = useState(1)

  // Prova identity, carried across steps and shown in the recap. The prova
  // must exist before presenze/repertorio can reference it, so step 1 ends
  // with a real POST /prove/ — as in the Servizio wizard, the following steps
  // are optional enrichment of an already valid entity, not part of one
  // transaction: abandoning the wizard midway leaves the prova created.
  const [provaId, setProvaId] = useState<number | null>(null)
  const [dataProvaCreata, setDataProvaCreata] = useState("")

  // Step 1 — dati prova + servizio di riferimento + indirizzo. indirizzo_id is
  // nullable on ProvaCreate (unlike Servizio), so IndirizzoField keeps its
  // default required={false}.
  const [form, setForm] = useState<ProvaFormState>(emptyForm)
  const [indirizzo, setIndirizzo] = useState<IndirizzoFormState>(emptyIndirizzoForm)
  const createProva = useCreateProva()
  const createIndirizzo = useCreateIndirizzo()
  const tipiIndirizzo = useLookupTipiIndirizzo()
  const [error1, setError1] = useState<string | null>(null)

  // Steps 2-3 own their data through OrganicoWizardStep/RepertorioWizardStep;
  // these queries only feed the recap counts and share the same
  // container-scoped queryKeys, so they add no extra requests.
  const container = { provaId: provaId ?? 0 }
  const organicoQuery = useOrganico(container)
  const repertorioQuery = useRepertorio(container)
  const organicoCount = organicoQuery.data?.items.length ?? 0
  const repertorioCount = repertorioQuery.data?.items.length ?? 0

  const isSubmittingStep1 = createProva.isPending || createIndirizzo.isPending

  const resetWizard = () => {
    setCurrentStep(1)
    setProvaId(null)
    setDataProvaCreata("")
    setForm(emptyForm)
    setIndirizzo(emptyIndirizzoForm)
    setError1(null)
  }

  const handleSubmitProva = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError1(null)

    try {
      // Create an indirizzo inline only when address details were entered.
      const indirizzo_id = await resolveIndirizzoId(indirizzo, createIndirizzo.mutateAsync)

      const prova = await createProva.mutateAsync({
        banda_codice: banda!.codice,
        data_prova: form.data_prova,
        indirizzo_id,
        servizio_id: form.servizio_id,
        note: form.note.trim() || null,
      })
      setProvaId(prova.id)
      setDataProvaCreata(prova.data_prova)
      toast({ title: "Prova creata" })
      setCurrentStep(2)
    } catch (err) {
      setError1(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
        onClick={() => navigate("/prove")}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Prove
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuova prova</h1>
        <p className="text-sm text-muted-foreground">
          Crea la prova e componi organico e repertorio in un unico percorso guidato.
        </p>
      </div>

      {currentStep <= STEPS.length && <StepIndicator currentStep={currentStep} />}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Dati prova</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitProva} className="space-y-4">
              {error1 && <ErrorBanner message={error1} />}

              <div className="space-y-2">
                <Label htmlFor="data_prova">Data e ora *</Label>
                <Input
                  id="data_prova"
                  type="datetime-local"
                  required
                  value={form.data_prova}
                  onChange={(e) => setForm((f) => ({ ...f, data_prova: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Servizio</Label>
                <p className="text-xs text-muted-foreground">
                  Facoltativo. Orienta la prova verso un servizio esistente.
                </p>
                <ServizioPicker
                  bandaCodice={banda!.codice}
                  value={form.servizio_id}
                  onChange={(id) => setForm((f) => ({ ...f, servizio_id: id }))}
                />
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
                  Crea prova
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && provaId != null && (
        <OrganicoWizardStep
          container={{ provaId }}
          onSkip={() => setCurrentStep(3)}
          onContinue={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && provaId != null && (
        <RepertorioWizardStep
          container={{ provaId }}
          onSkip={() => setCurrentStep(4)}
          onContinue={() => setCurrentStep(4)}
        />
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Prova creata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Data e ora</dt>
                <dd>{dataProvaCreata ? formatDataProva(dataProvaCreata) : "—"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Organico</dt>
                <dd>{organicoCount}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Repertorio</dt>
                <dd>{repertorioCount}</dd>
              </div>
            </dl>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetWizard}>
                Crea un'altra prova
              </Button>
              <Button type="button" onClick={() => navigate("/prove")}>
                Vai alla lista prove
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
