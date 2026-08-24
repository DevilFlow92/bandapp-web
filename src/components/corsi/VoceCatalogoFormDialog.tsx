import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { isAxiosError } from "axios"
import {
  useCreateVoceCatalogo,
  useLookupCategorieVoceProgramma,
  useUpdateVoceCatalogo,
} from "@/hooks/useCatalogoProgrammi"
import { useLookupTipiCorso } from "@/hooks/useCorsi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { VoceProgrammaCatalogo } from "@/types/voce_programma_catalogo"
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

const LIVELLI = [
  { value: "1", label: "1 - Base" },
  { value: "2", label: "2 - Intermedio" },
  { value: "3", label: "3 - Avanzato" },
]

interface VoceCatalogoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode: tipo corso non modificabile. */
  voce?: VoceProgrammaCatalogo | null
}

export default function VoceCatalogoFormDialog({
  open,
  onOpenChange,
  voce,
}: VoceCatalogoFormDialogProps) {
  const isEdit = Boolean(voce)
  const { toast } = useToast()

  const createVoce = useCreateVoceCatalogo()
  const updateVoce = useUpdateVoceCatalogo()
  const tipiCorso = useLookupTipiCorso()
  const categorie = useLookupCategorieVoceProgramma()

  const [tipoCorso, setTipoCorso] = useState("")
  const [categoria, setCategoria] = useState("")
  const [testo, setTesto] = useState("")
  const [livello, setLivello] = useState("1")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (voce) {
      setTipoCorso(String(voce.tipo_corso_codice))
      setCategoria(String(voce.categoria_codice))
      setTesto(voce.testo)
      setLivello(String(voce.livello))
    } else {
      setTipoCorso("")
      setCategoria("")
      setTesto("")
      setLivello("1")
    }
  }, [open, voce])

  const isSubmitting = createVoce.isPending || updateVoce.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!testo.trim()) {
      setError("Il testo della voce è obbligatorio.")
      return
    }
    if (!categoria) {
      setError("Seleziona una categoria.")
      return
    }
    if (!isEdit && !tipoCorso) {
      setError("Seleziona il tipo corso.")
      return
    }

    try {
      if (isEdit && voce) {
        await updateVoce.mutateAsync({
          id: voce.id,
          input: {
            categoria_codice: Number(categoria),
            testo: testo.trim(),
            livello: Number(livello),
          },
        })
        toast({ title: "Voce aggiornata" })
      } else {
        await createVoce.mutateAsync({
          tipo_corso_codice: Number(tipoCorso),
          categoria_codice: Number(categoria),
          testo: testo.trim(),
          livello: Number(livello),
        })
        toast({ title: "Voce creata" })
      }
      onOpenChange(false)
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError("Esiste già una voce con questo testo per questo tipo corso.")
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
              ? "Aggiorna categoria, testo e livello della voce di catalogo."
              : "Inserisci una nuova voce riutilizzabile nel catalogo programmi."}
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
            <Label htmlFor="tipo_corso_codice">Tipo corso *</Label>
            {isEdit ? (
              <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                {voce?.tipo_corso.descrizione} — non modificabile: se il tipo corso è sbagliato,
                disattiva questa voce e creane una nuova.
              </p>
            ) : (
              <Select value={tipoCorso} onValueChange={setTipoCorso}>
                <SelectTrigger id="tipo_corso_codice" disabled={tipiCorso.isLoading}>
                  <SelectValue placeholder="Seleziona tipo corso…" />
                </SelectTrigger>
                <SelectContent>
                  {(tipiCorso.data ?? []).map((t) => (
                    <SelectItem key={t.codice} value={String(t.codice)}>
                      {t.descrizione}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria_codice">Categoria *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger id="categoria_codice" disabled={categorie.isLoading}>
                <SelectValue placeholder="Seleziona categoria…" />
              </SelectTrigger>
              <SelectContent>
                {(categorie.data ?? []).map((c) => (
                  <SelectItem key={c.codice} value={String(c.codice)}>
                    {c.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testo">Testo *</Label>
            <Input
              id="testo"
              value={testo}
              placeholder="Es. Scale maggiori e minori"
              onChange={(e) => setTesto(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="livello">Livello *</Label>
            <Select value={livello} onValueChange={setLivello}>
              <SelectTrigger id="livello">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIVELLI.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
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
