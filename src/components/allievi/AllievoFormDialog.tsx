import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useUpdateAllievo } from "@/hooks/useAllievi"
import { usePersonaIndirizzi } from "@/hooks/useIndirizzi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Allievo } from "@/types/allievo"
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

const NONE_VALUE = "__none__"

interface AllievoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The dialog only ever edits an existing allievo; creation goes through the wizard. */
  allievo: Allievo | null
}

export default function AllievoFormDialog({ open, onOpenChange, allievo }: AllievoFormDialogProps) {
  const { toast } = useToast()
  const updateAllievo = useUpdateAllievo()
  const indirizzi = usePersonaIndirizzi(allievo?.persona_id ?? 0, open && allievo != null)

  const [codiceAllievo, setCodiceAllievo] = useState("")
  const [indirizzoId, setIndirizzoId] = useState(NONE_VALUE)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !allievo) return
    setError(null)
    setCodiceAllievo(allievo.codice_allievo)
    setIndirizzoId(allievo.indirizzo_id != null ? String(allievo.indirizzo_id) : NONE_VALUE)
  }, [open, allievo])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!allievo) return
    if (!codiceAllievo.trim()) {
      setError("Il codice allievo è obbligatorio.")
      return
    }

    try {
      await updateAllievo.mutateAsync({
        id: allievo.id,
        input: {
          codice_allievo: codiceAllievo.trim(),
          indirizzo_id: indirizzoId === NONE_VALUE ? null : Number(indirizzoId),
        },
      })
      toast({ title: "Allievo aggiornato" })
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica allievo</DialogTitle>
          <DialogDescription>Aggiorna i dati dell'allievo.</DialogDescription>
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
            <Label htmlFor="codice_allievo">Codice allievo *</Label>
            <Input
              id="codice_allievo"
              required
              maxLength={5}
              value={codiceAllievo}
              onChange={(e) => setCodiceAllievo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="indirizzo">Indirizzo</Label>
            <Select value={indirizzoId} onValueChange={setIndirizzoId}>
              <SelectTrigger id="indirizzo" disabled={indirizzi.isLoading}>
                <SelectValue placeholder="Nessuno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Nessuno</SelectItem>
                {indirizzi.data?.map((ind) => (
                  <SelectItem key={ind.id} value={String(ind.id)}>
                    {[ind.prima_riga, ind.numero_civico].filter(Boolean).join(", ") ||
                      `Indirizzo #${ind.id}`}
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
              disabled={updateAllievo.isPending}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={updateAllievo.isPending}>
              {updateAllievo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
