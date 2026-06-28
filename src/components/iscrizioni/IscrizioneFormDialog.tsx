import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  useCreateIscrizione,
  useLookupStatiIscrizione,
  useUpdateIscrizione,
} from "@/hooks/useIscrizioni"
import { useSoci } from "@/hooks/useSoci"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { Iscrizione } from "@/types/iscrizione"
import type { Socio } from "@/types/socio"
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

const CURRENT_YEAR = new Date().getFullYear()

interface IscrizioneFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  iscrizione?: Iscrizione | null
  /** Resolved "Nome Cognome" of the iscrizione's socio, for edit-mode display. */
  socioName?: string
  /**
   * In create mode, pre-fills (and locks) the socio so the iscrizione is bound
   * to it. Used by the socio detail page.
   */
  presetSocio?: Socio | null
}

interface FormState {
  anno: string
  data_iscrizione: string
  quota_partecipazione: string
  stato_iscrizione_codice: string
  note: string
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const emptyForm: FormState = {
  anno: String(CURRENT_YEAR),
  data_iscrizione: "",
  quota_partecipazione: "",
  stato_iscrizione_codice: "",
  note: "",
}

function socioLabel(socio: Socio): string {
  const nome = socio.persona?.nome ?? ""
  const cognome = socio.persona?.cognome ?? ""
  return `${nome} ${cognome} — ${socio.codice_socio}`.trim()
}

export default function IscrizioneFormDialog({
  open,
  onOpenChange,
  iscrizione,
  socioName,
  presetSocio,
}: IscrizioneFormDialogProps) {
  const isEdit = Boolean(iscrizione)
  const { toast } = useToast()
  const { banda } = useBanda()

  const createIscrizione = useCreateIscrizione()
  const updateIscrizione = useUpdateIscrizione()
  const stati = useLookupStatiIscrizione()

  // Socio selection (create mode only). The soci endpoint does not support text
  // search, so we fetch the banda's soci once and filter them client-side. When
  // a preset socio is supplied the picker is skipped, so the fetch is disabled.
  const sociQuery = useSoci(1, 50, banda?.codice ?? 0, open && !isEdit && !presetSocio && !!banda)
  const [search, setSearch] = useState("")
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const filteredSoci = useMemo(() => {
    const items = sociQuery.data?.items ?? []
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((s) => {
      const full = `${s.persona?.nome ?? ""} ${s.persona?.cognome ?? ""}`.trim().toLowerCase()
      return full.includes(q)
    })
  }, [sociQuery.data, search])

  // Reset the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    setError(null)
    setSearch("")
    setSelectedSocio(presetSocio ?? null)
    if (iscrizione) {
      setForm({
        anno: String(iscrizione.anno),
        data_iscrizione: iscrizione.data_iscrizione?.slice(0, 10) ?? "",
        quota_partecipazione: String(iscrizione.quota_partecipazione),
        stato_iscrizione_codice: String(iscrizione.stato_iscrizione_codice),
        note: iscrizione.note ?? "",
      })
    } else {
      setForm({ ...emptyForm, data_iscrizione: todayISO() })
    }
  }, [open, iscrizione, presetSocio])

  const isSubmitting = createIscrizione.isPending || updateIscrizione.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!form.stato_iscrizione_codice) {
      setError("Seleziona uno stato iscrizione.")
      return
    }

    const payload = {
      anno: Number(form.anno),
      data_iscrizione: form.data_iscrizione,
      quota_partecipazione: Number(form.quota_partecipazione),
      stato_iscrizione_codice: Number(form.stato_iscrizione_codice),
      note: form.note.trim() || null,
    }

    try {
      if (isEdit && iscrizione) {
        await updateIscrizione.mutateAsync({ id: iscrizione.id, input: payload })
        toast({ title: "Iscrizione aggiornata" })
      } else {
        if (!selectedSocio) {
          setError("Seleziona un socio.")
          return
        }
        await createIscrizione.mutateAsync({
          socio_id: selectedSocio.id,
          ...payload,
        })
        toast({ title: "Iscrizione creata" })
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
          <DialogTitle>{isEdit ? "Modifica iscrizione" : "Nuova iscrizione"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dati dell'iscrizione."
              : "Seleziona un socio e inserisci i dati dell'iscrizione."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="socio">Socio *</Label>
            {isEdit ? (
              <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                {socioName ?? "—"}
              </div>
            ) : presetSocio ? (
              <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                {socioLabel(presetSocio)}
              </div>
            ) : selectedSocio ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{socioLabel(selectedSocio)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSocio(null)}
                >
                  Cambia
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="socio"
                  placeholder="Cerca per nome o cognome…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {sociQuery.isLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Caricamento…
                    </div>
                  ) : filteredSoci.length > 0 ? (
                    <ul className="divide-y">
                      {filteredSoci.map((socio) => (
                        <li key={socio.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                            onClick={() => {
                              setSelectedSocio(socio)
                              setSearch("")
                            }}
                          >
                            {socioLabel(socio)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nessun socio trovato
                    </div>
                  )}
                </div>
              </>
            )}
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
              <Label htmlFor="data_iscrizione">Data iscrizione *</Label>
              <Input
                id="data_iscrizione"
                type="date"
                required
                value={form.data_iscrizione}
                onChange={(e) => setForm((f) => ({ ...f, data_iscrizione: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quota">Quota partecipazione *</Label>
              <Input
                id="quota"
                type="number"
                step="0.01"
                required
                value={form.quota_partecipazione}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    quota_partecipazione: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stato">Stato iscrizione *</Label>
              <Select
                value={form.stato_iscrizione_codice}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, stato_iscrizione_codice: value }))
                }
              >
                <SelectTrigger id="stato">
                  <SelectValue placeholder="Seleziona…" />
                </SelectTrigger>
                <SelectContent>
                  {stati.data?.map((s) => (
                    <SelectItem key={s.codice} value={String(s.codice)}>
                      {s.descrizione}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
