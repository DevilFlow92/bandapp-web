import { useEffect, useRef, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { isAxiosError } from "axios"
import {
  useCreateVoceContabilita,
  useLookupSezioniRendiconto,
  useLookupSottovociRendiconto,
  useLookupVociRendiconto,
  useUpdateVoceContabilita,
} from "@/hooks/useVociContabilita"
import { useBanda } from "@/context/BandaContext"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { VoceContabilita } from "@/types/voce-contabilita"
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

interface VoceContabilitaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  voce?: VoceContabilita | null
}

export default function VoceContabilitaFormDialog({
  open,
  onOpenChange,
  voce,
}: VoceContabilitaFormDialogProps) {
  const isEdit = Boolean(voce)
  const { banda } = useBanda()
  const { toast } = useToast()

  const createVoce = useCreateVoceContabilita()
  const updateVoce = useUpdateVoceContabilita()

  const [nome, setNome] = useState("")
  const [sezione, setSezione] = useState("")
  const [voceRendiconto, setVoceRendiconto] = useState("")
  const [sottovoce, setSottovoce] = useState("")
  const [error, setError] = useState<string | null>(null)

  const sezioni = useLookupSezioniRendiconto()
  const vociRendiconto = useLookupVociRendiconto(sezione ? Number(sezione) : undefined)
  const sottovoci = useLookupSottovociRendiconto(
    voceRendiconto ? Number(voceRendiconto) : undefined,
  )

  // Targets for the sequential edit pre-fill. Set when the dialog opens in edit
  // mode and consumed (cleared) by the chained effects below as each cascade
  // level's options load. Clearing them after use is what prevents loops.
  const pendingVoce = useRef<number | null>(null)
  const pendingSottovoce = useRef<number | null>(null)

  // Reset / seed the form whenever the dialog opens or the target voce changes.
  useEffect(() => {
    if (!open) return
    setError(null)
    if (voce) {
      setNome(voce.voce_contabilita)
      setSezione(String(voce.sezione_rendiconto_codice))
      setVoceRendiconto("")
      setSottovoce("")
      pendingVoce.current = voce.voce_rendiconto_codice
      pendingSottovoce.current = voce.sottovoce_rendiconto_codice
    } else {
      setNome("")
      setSezione("")
      setVoceRendiconto("")
      setSottovoce("")
      pendingVoce.current = null
      pendingSottovoce.current = null
    }
  }, [open, voce])

  // Once the voci for the seeded sezione have loaded, apply the pending voce.
  useEffect(() => {
    if (pendingVoce.current == null || !vociRendiconto.data) return
    const target = pendingVoce.current
    if (vociRendiconto.data.some((v) => v.codice === target)) {
      setVoceRendiconto(String(target))
    }
    pendingVoce.current = null
  }, [vociRendiconto.data])

  // Once the sottovoci for the seeded voce have loaded, apply the pending sottovoce.
  useEffect(() => {
    if (pendingSottovoce.current == null || !sottovoci.data) return
    const target = pendingSottovoce.current
    if (sottovoci.data.some((s) => s.codice === target)) {
      setSottovoce(String(target))
    }
    pendingSottovoce.current = null
  }, [sottovoci.data])

  // Changing a parent select resets its children and cancels any pending
  // pre-fill so a manual choice is never overwritten.
  const handleSezioneChange = (value: string) => {
    setSezione(value)
    setVoceRendiconto("")
    setSottovoce("")
    pendingVoce.current = null
    pendingSottovoce.current = null
  }

  const handleVoceChange = (value: string) => {
    setVoceRendiconto(value)
    setSottovoce("")
    pendingSottovoce.current = null
  }

  const isSubmitting = createVoce.isPending || updateVoce.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!nome.trim()) {
      setError("Il nome della voce è obbligatorio.")
      return
    }
    if (!sezione || !voceRendiconto || !sottovoce) {
      setError("Seleziona sezione, voce e sottovoce di rendiconto.")
      return
    }

    const fields = {
      voce_contabilita: nome.trim(),
      sezione_rendiconto_codice: Number(sezione),
      voce_rendiconto_codice: Number(voceRendiconto),
      sottovoce_rendiconto_codice: Number(sottovoce),
    }

    try {
      if (isEdit && voce) {
        await updateVoce.mutateAsync({ id: voce.id, input: fields })
        toast({ title: "Voce aggiornata" })
      } else {
        if (!banda) {
          setError("Nessuna banda selezionata.")
          return
        }
        await createVoce.mutateAsync({ banda_codice: banda.codice, ...fields })
        toast({ title: "Voce creata" })
      }
      onOpenChange(false)
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError("Una voce con questo nome esiste già per la banda.")
        return
      }
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica voce" : "Nuova voce"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna la voce e la sua classificazione di rendiconto."
              : "Inserisci la voce e la sua classificazione di rendiconto."}
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
            <Label htmlFor="voce_contabilita">Nome voce *</Label>
            <Input
              id="voce_contabilita"
              value={nome}
              placeholder="Es. Assicurazione strumenti"
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sezione_rendiconto">Sezione rendiconto *</Label>
            <Select value={sezione} onValueChange={handleSezioneChange}>
              <SelectTrigger id="sezione_rendiconto">
                <SelectValue placeholder="Seleziona sezione…" />
              </SelectTrigger>
              <SelectContent>
                {(sezioni.data ?? []).map((s) => (
                  <SelectItem key={s.codice} value={String(s.codice)}>
                    {s.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voce_rendiconto">Voce rendiconto *</Label>
            <Select value={voceRendiconto} onValueChange={handleVoceChange} disabled={!sezione}>
              <SelectTrigger id="voce_rendiconto">
                <SelectValue placeholder="Seleziona voce…" />
              </SelectTrigger>
              <SelectContent>
                {(vociRendiconto.data ?? []).map((v) => (
                  <SelectItem key={v.codice} value={String(v.codice)}>
                    {v.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sottovoce_rendiconto">Sottovoce rendiconto *</Label>
            <Select value={sottovoce} onValueChange={setSottovoce} disabled={!voceRendiconto}>
              <SelectTrigger id="sottovoce_rendiconto">
                <SelectValue placeholder="Seleziona sottovoce…" />
              </SelectTrigger>
              <SelectContent>
                {(sottovoci.data ?? []).map((sv) => (
                  <SelectItem key={sv.codice} value={String(sv.codice)}>
                    {sv.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
