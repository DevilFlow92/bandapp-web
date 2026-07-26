import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useCreateProva, useUpdateProva } from "@/hooks/useProve"
import { useCreateIndirizzo, useLookupTipiIndirizzo } from "@/hooks/useServizi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Prova } from "@/types/prova"
import { formatIndirizzoServizio } from "@/components/servizi/ServizioFormDialog"
import ServizioPicker from "@/components/prove/ServizioPicker"
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

/** Default tipo indirizzo "Servizio" (codice 4), pre-selected for new prove. */
const DEFAULT_TIPO_INDIRIZZO_CODICE = "4"

interface ProvaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  prova?: Prova | null
}

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

interface IndirizzoFormState {
  tipo_indirizzo_codice: string
  prima_riga: string
  numero_civico: string
  cap: string
  comune_codice: number | null
}

const emptyIndirizzo: IndirizzoFormState = {
  tipo_indirizzo_codice: DEFAULT_TIPO_INDIRIZZO_CODICE,
  prima_riga: "",
  numero_civico: "",
  cap: "",
  comune_codice: null,
}

export default function ProvaFormDialog({ open, onOpenChange, prova }: ProvaFormDialogProps) {
  const isEdit = Boolean(prova)
  const { toast } = useToast()
  const { banda } = useBanda()

  const createProva = useCreateProva()
  const updateProva = useUpdateProva()
  const createIndirizzo = useCreateIndirizzo()
  const tipiIndirizzo = useLookupTipiIndirizzo()

  const [form, setForm] = useState<ProvaFormState>(emptyForm)
  const [indirizzo, setIndirizzo] = useState<IndirizzoFormState>(emptyIndirizzo)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setIndirizzo(emptyIndirizzo)
    if (prova) {
      setForm({
        // datetime-local expects "YYYY-MM-DDTHH:MM".
        data_prova: prova.data_prova?.slice(0, 16) ?? "",
        servizio_id: prova.servizio_id,
        note: prova.note ?? "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, prova])

  const isSubmitting = createProva.isPending || updateProva.isPending || createIndirizzo.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      if (isEdit && prova) {
        // Edit mode keeps the existing indirizzo; it is not re-created here.
        await updateProva.mutateAsync({
          id: prova.id,
          input: {
            data_prova: form.data_prova,
            servizio_id: form.servizio_id,
            note: form.note.trim() || null,
          },
        })
        toast({ title: "Prova aggiornata" })
      } else {
        // Create an indirizzo inline only when address details were entered.
        const primaRiga = indirizzo.prima_riga.trim()
        const anyAddressFilled =
          primaRiga !== "" ||
          indirizzo.numero_civico.trim() !== "" ||
          indirizzo.cap.trim() !== "" ||
          indirizzo.comune_codice !== null

        if (anyAddressFilled && !primaRiga) {
          setError("La via / piazza è obbligatoria se inserisci un indirizzo.")
          return
        }

        let indirizzo_id: number | undefined
        if (primaRiga) {
          const created = await createIndirizzo.mutateAsync({
            tipo_indirizzo_codice: Number(indirizzo.tipo_indirizzo_codice),
            prima_riga: primaRiga,
            numero_civico: indirizzo.numero_civico.trim() || null,
            cap: indirizzo.cap.trim() || null,
            comune_codice: indirizzo.comune_codice,
          })
          indirizzo_id = created.id
        }

        await createProva.mutateAsync({
          banda_codice: banda!.codice,
          data_prova: form.data_prova,
          indirizzo_id,
          servizio_id: form.servizio_id,
          note: form.note.trim() || null,
        })
        toast({ title: "Prova creata" })
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
          <DialogTitle>{isEdit ? "Modifica prova" : "Nuova prova"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Aggiorna i dati della prova." : "Inserisci i dati della nuova prova."}
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
            <legend className="text-sm font-semibold">Indirizzo</legend>

            {isEdit ? (
              <div className="space-y-1 rounded-md border px-3 py-2 text-sm">
                <p>{formatIndirizzoServizio(prova?.indirizzo)}</p>
                {prova?.indirizzo_id != null && (
                  <p className="text-xs text-muted-foreground">
                    Indirizzo già associato (ID: {prova.indirizzo_id}). Per modificare l'indirizzo,
                    gestirlo separatamente.
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Facoltativo. Compila la via per creare e associare un nuovo indirizzo.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_indirizzo">Tipo</Label>
                    <Select
                      value={indirizzo.tipo_indirizzo_codice}
                      onValueChange={(value) =>
                        setIndirizzo((i) => ({
                          ...i,
                          tipo_indirizzo_codice: value,
                        }))
                      }
                    >
                      <SelectTrigger id="tipo_indirizzo">
                        <SelectValue placeholder="Seleziona…" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipiIndirizzo.data?.map((tipo) => (
                          <SelectItem key={tipo.codice} value={String(tipo.codice)}>
                            {tipo.descrizione}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_civico">Numero civico</Label>
                    <Input
                      id="numero_civico"
                      value={indirizzo.numero_civico}
                      onChange={(e) =>
                        setIndirizzo((i) => ({
                          ...i,
                          numero_civico: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prima_riga">Via / Piazza</Label>
                  <Input
                    id="prima_riga"
                    value={indirizzo.prima_riga}
                    onChange={(e) =>
                      setIndirizzo((i) => ({
                        ...i,
                        prima_riga: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2 sm:max-w-[12rem]">
                  <Label htmlFor="cap">CAP</Label>
                  <Input
                    id="cap"
                    value={indirizzo.cap}
                    onChange={(e) => setIndirizzo((i) => ({ ...i, cap: e.target.value }))}
                  />
                </div>

                <ComuneSelect
                  value={indirizzo.comune_codice}
                  onChange={(codice) => setIndirizzo((i) => ({ ...i, comune_codice: codice }))}
                  label="Comune"
                />
              </>
            )}
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
