import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  useCreateConfigurazioneAnno,
  useLookupVociContabilita,
  useUpdateConfigurazioneAnno,
} from "@/hooks/useConfigurazioneAnno"
import { useBanda } from "@/context/BandaContext"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { ConfigurazioneBandaAnno } from "@/types/configurazione-anno"
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

interface ConfigurazioneAnnoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  configurazione?: ConfigurazioneBandaAnno | null
}

interface ConfigFormState {
  anno: string
  quota_annuale_attesa: string
  saldo_iniziale_cassa: string
  saldo_iniziale_banca: string
  voce_contabilita_quote_id: string
}

function emptyForm(): ConfigFormState {
  return {
    anno: String(new Date().getFullYear()),
    quota_annuale_attesa: "",
    saldo_iniziale_cassa: "0",
    saldo_iniziale_banca: "0",
    voce_contabilita_quote_id: NONE_VALUE,
  }
}

export default function ConfigurazioneAnnoFormDialog({
  open,
  onOpenChange,
  configurazione,
}: ConfigurazioneAnnoFormDialogProps) {
  const isEdit = Boolean(configurazione)
  const isClosed = configurazione?.chiuso === true
  const { banda } = useBanda()
  const { toast } = useToast()

  const createConfig = useCreateConfigurazioneAnno()
  const updateConfig = useUpdateConfigurazioneAnno()
  const voci = useLookupVociContabilita(banda?.codice ?? 0, open && !!banda)

  const [form, setForm] = useState<ConfigFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (configurazione) {
      setForm({
        anno: String(configurazione.anno),
        quota_annuale_attesa: configurazione.quota_annuale_attesa,
        saldo_iniziale_cassa: configurazione.saldo_iniziale_cassa,
        saldo_iniziale_banca: configurazione.saldo_iniziale_banca,
        voce_contabilita_quote_id:
          configurazione.voce_contabilita_quote_id != null
            ? String(configurazione.voce_contabilita_quote_id)
            : NONE_VALUE,
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, configurazione])

  const isSubmitting = createConfig.isPending || updateConfig.isPending
  const vociList = voci.data ?? []

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!form.quota_annuale_attesa.trim()) {
      setError("La quota annuale attesa è obbligatoria.")
      return
    }

    const voceId =
      form.voce_contabilita_quote_id === NONE_VALUE ? null : Number(form.voce_contabilita_quote_id)

    try {
      if (isEdit && configurazione) {
        await updateConfig.mutateAsync({
          id: configurazione.id,
          input: {
            quota_annuale_attesa: form.quota_annuale_attesa.trim(),
            saldo_iniziale_cassa: form.saldo_iniziale_cassa.trim() || "0",
            saldo_iniziale_banca: form.saldo_iniziale_banca.trim() || "0",
            voce_contabilita_quote_id: voceId,
          },
        })
        toast({ title: "Configurazione aggiornata" })
      } else {
        if (!banda) {
          setError("Nessuna banda selezionata.")
          return
        }
        const anno = Number(form.anno)
        if (!Number.isInteger(anno) || anno <= 0) {
          setError("Inserisci un anno valido.")
          return
        }
        await createConfig.mutateAsync({
          banda_codice: banda.codice,
          anno,
          quota_annuale_attesa: form.quota_annuale_attesa.trim(),
          saldo_iniziale_cassa: form.saldo_iniziale_cassa.trim() || "0",
          saldo_iniziale_banca: form.saldo_iniziale_banca.trim() || "0",
          voce_contabilita_quote_id: voceId,
        })
        toast({ title: "Configurazione creata" })
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
          <DialogTitle>{isEdit ? "Modifica configurazione" : "Nuova configurazione"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dati della configurazione contabile."
              : "Inserisci i dati della configurazione contabile per l'anno."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isClosed && (
            <div
              role="alert"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              Anno chiuso: per modificare riapri prima l'anno.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="anno">Anno *</Label>
            <Input
              id="anno"
              type="number"
              value={form.anno}
              disabled={isEdit || isClosed}
              onChange={(e) => setForm((f) => ({ ...f, anno: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quota_annuale_attesa">Quota annuale attesa (€) *</Label>
            <Input
              id="quota_annuale_attesa"
              type="number"
              step="0.01"
              value={form.quota_annuale_attesa}
              disabled={isClosed}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  quota_annuale_attesa: e.target.value,
                }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="saldo_iniziale_cassa">Saldo iniziale cassa (€)</Label>
              <Input
                id="saldo_iniziale_cassa"
                type="number"
                step="0.01"
                value={form.saldo_iniziale_cassa}
                disabled={isClosed}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    saldo_iniziale_cassa: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="saldo_iniziale_banca">Saldo iniziale banca (€)</Label>
              <Input
                id="saldo_iniziale_banca"
                type="number"
                step="0.01"
                value={form.saldo_iniziale_banca}
                disabled={isClosed}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    saldo_iniziale_banca: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voce_contabilita_quote_id">
              Voce contabilità per quote associative
            </Label>
            <Select
              value={form.voce_contabilita_quote_id}
              disabled={isClosed}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, voce_contabilita_quote_id: value }))
              }
            >
              <SelectTrigger id="voce_contabilita_quote_id">
                <SelectValue placeholder="Seleziona…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Nessuna voce</SelectItem>
                {vociList.map((voce) => (
                  <SelectItem key={voce.id} value={String(voce.id)}>
                    {voce.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Necessaria per il flusso di cassa automatico quando un'iscrizione viene pagata.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {isClosed ? "Chiudi" : "Annulla"}
            </Button>
            {!isClosed && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Salva" : "Crea"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
