import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  useCreateIscrizioneCorso,
  useUpdateIscrizioneCorso,
  useLookupStatiIscrizioneCorso,
} from "@/hooks/useIscrizioniCorso"
import { useUploadDocumento } from "@/hooks/useDocumenti"
import { useSoci } from "@/hooks/useSoci"
import { useEsterni } from "@/hooks/useEsterni"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { IscrizioneCorso } from "@/types/iscrizione_corso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STATO_RICHIESTA_CODICE = 1

interface IscrizioneCorsoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  corsoId: number
  /** When provided the dialog opens in edit mode (solo stato/note/documento). */
  iscrizione?: IscrizioneCorso | null
}

interface FormState {
  stato_iscrizione_corso_codice: string
  data_iscrizione: string
  note: string
}

interface SelectedPersona {
  personaId: number
  label: string
}

function personaLabel(
  persona: { nome: string; cognome: string } | null | undefined,
  codice: string,
): string {
  const nome = persona?.nome ?? ""
  const cognome = persona?.cognome ?? ""
  return `${nome} ${cognome} — ${codice}`.trim()
}

function personaFullName(
  persona: { nome?: string | null; cognome?: string | null } | null | undefined,
): string {
  return `${persona?.nome ?? ""} ${persona?.cognome ?? ""}`.trim() || "—"
}

/** Data odierna in formato "YYYY-MM-DD" per l'input date. */
function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const emptyForm: FormState = {
  stato_iscrizione_corso_codice: String(STATO_RICHIESTA_CODICE),
  data_iscrizione: "",
  note: "",
}

export default function IscrizioneCorsoFormDialog({
  open,
  onOpenChange,
  corsoId,
  iscrizione,
}: IscrizioneCorsoFormDialogProps) {
  const isEdit = Boolean(iscrizione)
  const { toast } = useToast()
  const { banda } = useBanda()

  const createIscrizioneCorso = useCreateIscrizioneCorso()
  const updateIscrizioneCorso = useUpdateIscrizioneCorso()
  const uploadDocumento = useUploadDocumento()
  const statiIscrizioneCorso = useLookupStatiIscrizioneCorso()

  // Selezione alunno: una Persona, socio o esterno (card backend #174), stesso
  // pattern di ricerca socio/esterno di RicevutaFormDialog. Non applicabile in
  // modifica: l'alunno di un'iscrizione esistente non si cambia da qui.
  const [tipo, setTipo] = useState<"socio" | "esterno">("socio")
  const sociQuery = useSoci(
    1,
    100,
    banda?.codice ?? 0,
    open && !isEdit && tipo === "socio" && !!banda,
  )
  const esterniQuery = useEsterni(
    1,
    100,
    banda?.codice ?? 0,
    open && !isEdit && tipo === "esterno" && !!banda,
  )
  const [search, setSearch] = useState("")
  const [selectedPersona, setSelectedPersona] = useState<SelectedPersona | null>(null)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRoster = tipo === "socio" ? sociQuery.isLoading : esterniQuery.isLoading

  const options = useMemo(() => {
    if (tipo === "socio") {
      return (sociQuery.data?.items ?? []).map((s) => ({
        personaId: s.persona_id,
        label: personaLabel(s.persona, s.codice_socio),
      }))
    }
    return (esterniQuery.data?.items ?? []).map((e) => ({
      personaId: e.persona_id,
      label: personaLabel(e.persona, e.codice_esterno),
    }))
  }, [tipo, sociQuery.data, esterniQuery.data])

  const trimmedSearch = search.trim()
  const filteredOptions = useMemo(() => {
    const q = trimmedSearch.toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, trimmedSearch])

  useEffect(() => {
    if (!open) return
    setError(null)
    setFile(null)
    setTipo("socio")
    setSearch("")
    setSelectedPersona(null)
    if (iscrizione) {
      setForm({
        stato_iscrizione_corso_codice: String(iscrizione.stato_iscrizione_corso_codice),
        data_iscrizione: iscrizione.data_iscrizione,
        note: iscrizione.note ?? "",
      })
    } else {
      setForm({ ...emptyForm, data_iscrizione: today() })
    }
  }, [open, iscrizione])

  const isSubmitting =
    createIscrizioneCorso.isPending || updateIscrizioneCorso.isPending || uploadDocumento.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!isEdit && !selectedPersona) {
      setError("Seleziona l'alunno da iscrivere.")
      return
    }

    try {
      let documento_id: number | undefined
      if (file) {
        const documento = await uploadDocumento.mutateAsync({ file })
        documento_id = documento.id
      }

      if (isEdit && iscrizione) {
        await updateIscrizioneCorso.mutateAsync({
          id: iscrizione.id,
          input: {
            stato_iscrizione_corso_codice: Number(form.stato_iscrizione_corso_codice),
            note: form.note.trim() || null,
            ...(documento_id !== undefined ? { documento_id } : {}),
          },
        })
        toast({ title: "Iscrizione aggiornata" })
      } else {
        await createIscrizioneCorso.mutateAsync({
          corso_id: corsoId,
          persona_id: selectedPersona!.personaId,
          stato_iscrizione_corso_codice: Number(form.stato_iscrizione_corso_codice),
          data_iscrizione: form.data_iscrizione,
          note: form.note.trim() || null,
          documento_id,
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
              ? "Aggiorna stato, note o documento dell'iscrizione."
              : "Iscrivi un alunno (socio o esterno) al corso."}
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

          {isEdit ? (
            <div className="space-y-2">
              <Label>Alunno</Label>
              <p className="rounded-md border px-3 py-2 text-sm">
                {personaFullName(iscrizione?.persona)}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Alunno</Label>
              {selectedPersona ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{selectedPersona.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPersona(null)}
                  >
                    Rimuovi
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={tipo === "socio" ? "default" : "outline"}
                      onClick={() => {
                        setTipo("socio")
                        setSearch("")
                      }}
                    >
                      Socio
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={tipo === "esterno" ? "default" : "outline"}
                      onClick={() => {
                        setTipo("esterno")
                        setSearch("")
                      }}
                    >
                      Esterno
                    </Button>
                  </div>
                  <Input
                    placeholder="Cerca per nome, cognome o codice…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    {isLoadingRoster ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Caricamento…
                      </div>
                    ) : filteredOptions.length > 0 ? (
                      <ul className="divide-y">
                        {filteredOptions.map((option) => (
                          <li key={option.personaId}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                              onClick={() => {
                                setSelectedPersona(option)
                                setSearch("")
                              }}
                            >
                              {option.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {tipo === "socio" ? "Nessun socio trovato" : "Nessun esterno trovato"}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stato_iscrizione_corso_codice">Stato iscrizione *</Label>
              <Select
                value={form.stato_iscrizione_corso_codice}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, stato_iscrizione_corso_codice: value }))
                }
              >
                <SelectTrigger
                  id="stato_iscrizione_corso_codice"
                  disabled={statiIscrizioneCorso.isLoading}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statiIscrizioneCorso.isLoading ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Caricamento…</div>
                  ) : (
                    (statiIscrizioneCorso.data ?? []).map((stato) => (
                      <SelectItem key={stato.codice} value={String(stato.codice)}>
                        {stato.descrizione}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {!isEdit && (
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
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Modulo di richiesta</legend>
            {iscrizione?.documento_id != null ? (
              <div className="space-y-1 rounded-md border px-3 py-2 text-sm">
                <p>{iscrizione.documento?.nome ?? `Documento #${iscrizione.documento_id}`}</p>
                <p className="text-xs text-muted-foreground">
                  Documento già collegato. Per sostituirlo, gestiscilo separatamente.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Facoltativo. Carica il modulo di richiesta firmato per collegarlo all'iscrizione.
                </p>
                <Input
                  type="file"
                  disabled={isSubmitting}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
