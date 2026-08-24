import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Check, Loader2 } from "lucide-react"
import { isAxiosError } from "axios"
import {
  useCreateIscrizioneCorso,
  useUpdateIscrizioneCorso,
  useLookupStatiIscrizioneCorso,
} from "@/hooks/useIscrizioniCorso"
import { useUploadDocumento } from "@/hooks/useDocumenti"
import { useSoci } from "@/hooks/useSoci"
import { useEsterni } from "@/hooks/useEsterni"
import { useAllievi } from "@/hooks/useAllievi"
import GeneraDocumentoIscrizioneCorso from "@/components/corsi/GeneraDocumentoIscrizioneCorso"
import {
  useSchedaAlunno,
  useCreateSchedaAlunno,
  useUpdateSchedaAlunno,
} from "@/hooks/useSchedeAlunno"
import AutovalutazioniLog from "@/components/corsi/AutovalutazioniLog"
import SchedaAlunnoMaterialiEditor from "@/components/corsi/SchedaAlunnoMaterialiEditor"
import SchedaAlunnoVociEditor from "@/components/corsi/SchedaAlunnoVociEditor"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useBanda } from "@/context/BandaContext"
import type { IscrizioneCorso } from "@/types/iscrizione_corso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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

  // Selezione alunno: una Persona, socio, esterno o allievo (card backend
  // #174, estesa da #166a), stesso pattern di ricerca socio/esterno di
  // RicevutaFormDialog. Non applicabile in modifica: l'alunno di
  // un'iscrizione esistente non si cambia da qui.
  const [tipo, setTipo] = useState<"socio" | "esterno" | "allievo">("socio")
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
  const allieviQuery = useAllievi(
    1,
    100,
    banda?.codice ?? 0,
    open && !isEdit && tipo === "allievo" && !!banda,
  )
  const [search, setSearch] = useState("")
  const [selectedPersona, setSelectedPersona] = useState<SelectedPersona | null>(null)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Modalità del fieldset "Modulo di richiesta" in edit mode: l'utente
  // sceglie esplicitamente tra caricare un file o generarlo da un modulo,
  // senza alcuna precedenza automatica tra le due vie.
  const [modoDocumento, setModoDocumento] = useState<"nessuno" | "upload" | "genera">("nessuno")

  // Scheda alunno (card #21): risorsa 1:1 indipendente dall'iscrizione, con
  // submit proprio disaccoppiato da stato/note/documento (come già oggi per
  // documento, gestito a parte). Visibile solo in modifica.
  const createSchedaAlunno = useCreateSchedaAlunno()
  const updateSchedaAlunno = useUpdateSchedaAlunno()
  const schedaAlunnoQuery = useSchedaAlunno(iscrizione?.id ?? 0, open && isEdit)
  const scheda = schedaAlunnoQuery.data
  const [schedaForm, setSchedaForm] = useState({ note: "" })
  const [schedaError, setSchedaError] = useState<string | null>(null)
  // Autosave delle note (rifinitura #203): "saving"/"saved" pilotano
  // l'indicatore inline vicino alla label, "idle" lo nasconde. Il timeout
  // che riporta a "idle" dopo "saved" è tracciato in un ref per poterlo
  // cancellare se un nuovo blur riparte prima che scada (altrimenti un
  // salvataggio più recente potrebbe essere azzerato a "idle" da un
  // timeout ormai obsoleto).
  const [noteSaveStatus, setNoteSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const noteSavedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (noteSavedTimeoutRef.current) clearTimeout(noteSavedTimeoutRef.current)
    }
  }, [])

  const isLoadingRoster =
    tipo === "socio"
      ? sociQuery.isLoading
      : tipo === "esterno"
        ? esterniQuery.isLoading
        : allieviQuery.isLoading

  const options = useMemo(() => {
    if (tipo === "socio") {
      return (sociQuery.data?.items ?? []).map((s) => ({
        personaId: s.persona_id,
        label: personaLabel(s.persona, s.codice_socio),
      }))
    }
    if (tipo === "esterno") {
      return (esterniQuery.data?.items ?? []).map((e) => ({
        personaId: e.persona_id,
        label: personaLabel(e.persona, e.codice_esterno),
      }))
    }
    return (allieviQuery.data?.items ?? []).map((a) => ({
      personaId: a.persona_id,
      label: personaLabel(a.persona, a.codice_allievo),
    }))
  }, [tipo, sociQuery.data, esterniQuery.data, allieviQuery.data])

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
    setModoDocumento("nessuno")
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

  useEffect(() => {
    if (!open || !isEdit) return
    setSchedaError(null)
    setSchedaForm({ note: scheda?.note ?? "" })
    setNoteSaveStatus("idle")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, scheda?.id])

  /** Crea la scheda alunno (solo quando non esiste ancora): unica azione esplicita rimasta, l'update di `note` è autosave. */
  const handleSchedaCreate = async () => {
    if (!iscrizione) return
    setSchedaError(null)
    try {
      await createSchedaAlunno.mutateAsync({
        iscrizione_corso_id: iscrizione.id,
        note: schedaForm.note.trim() || null,
      })
      toast({ title: "Scheda alunno creata" })
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast({
          variant: "destructive",
          title: "Scheda alunno già esistente",
          description: getErrorMessage(err),
        })
        schedaAlunnoQuery.refetch()
      } else {
        setSchedaError(getErrorMessage(err))
      }
    }
  }

  /** Autosave delle note on-blur, stesso pattern di `handleDettaglioBlur` in SchedaAlunnoVociEditor: nessuna PATCH se il testo non è cambiato. */
  const handleNoteBlur = (value: string) => {
    if (!scheda) return
    const note = value.trim() || null
    if (note === scheda.note) return
    if (noteSavedTimeoutRef.current) {
      clearTimeout(noteSavedTimeoutRef.current)
      noteSavedTimeoutRef.current = null
    }
    setNoteSaveStatus("saving")
    updateSchedaAlunno.mutate(
      { id: scheda.id, input: { note } },
      {
        onSuccess: () => {
          setNoteSaveStatus("saved")
          noteSavedTimeoutRef.current = setTimeout(() => setNoteSaveStatus("idle"), 2000)
        },
        onError: (err) => {
          setNoteSaveStatus("idle")
          toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
        },
      },
    )
  }

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
              : "Iscrivi un alunno (socio, esterno o allievo) al corso."}
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
                    <Button
                      type="button"
                      size="sm"
                      variant={tipo === "allievo" ? "default" : "outline"}
                      onClick={() => {
                        setTipo("allievo")
                        setSearch("")
                      }}
                    >
                      Allievo
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
                        {tipo === "socio"
                          ? "Nessun socio trovato"
                          : tipo === "esterno"
                            ? "Nessun esterno trovato"
                            : "Nessun allievo trovato"}
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
            {!isEdit ? (
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
            ) : modoDocumento === "genera" ? (
              <div className="space-y-2">
                <GeneraDocumentoIscrizioneCorso
                  iscrizioneCorsoId={iscrizione!.id}
                  bandaCodice={banda?.codice ?? 0}
                  documentoAttuale={
                    iscrizione?.documento_id != null
                      ? {
                          id: iscrizione.documento_id,
                          nome:
                            iscrizione.documento?.nome ?? `Documento #${iscrizione.documento_id}`,
                        }
                      : null
                  }
                  onDocumentoCollegato={() => onOpenChange(false)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setModoDocumento("nessuno")}
                >
                  Annulla
                </Button>
              </div>
            ) : modoDocumento === "upload" ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Il file verrà collegato salvando le modifiche (Salva).
                </p>
                <Input
                  type="file"
                  disabled={isSubmitting}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setModoDocumento("nessuno")
                  }}
                >
                  Annulla
                </Button>
              </div>
            ) : (
              <>
                {iscrizione?.documento_id != null && (
                  <div className="rounded-md border px-3 py-2 text-sm">
                    <p>{iscrizione.documento?.nome ?? `Documento #${iscrizione.documento_id}`}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setModoDocumento("upload")}
                  >
                    {iscrizione?.documento_id != null ? "Sostituisci con upload" : "Carica file"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setModoDocumento("genera")}
                  >
                    {iscrizione?.documento_id != null ? "Rigenera da template" : "Genera da modulo"}
                  </Button>
                </div>
              </>
            )}
          </fieldset>

          {isEdit && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Scheda alunno</legend>
              {schedaAlunnoQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <>
                  {schedaError && (
                    <div
                      role="alert"
                      className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {schedaError}
                    </div>
                  )}
                  {scheda ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="scheda_note">Note scheda</Label>
                        {noteSaveStatus !== "idle" && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {noteSaveStatus === "saving" ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Salvataggio…
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3" />
                                Salvato
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <textarea
                        id="scheda_note"
                        key={`${scheda.id}-${scheda.note ?? ""}`}
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        defaultValue={scheda.note ?? ""}
                        onBlur={(e) => handleNoteBlur(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="scheda_note">Note scheda</Label>
                      <textarea
                        id="scheda_note"
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={schedaForm.note}
                        disabled={createSchedaAlunno.isPending}
                        onChange={(e) => setSchedaForm((f) => ({ ...f, note: e.target.value }))}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={createSchedaAlunno.isPending}
                        onClick={handleSchedaCreate}
                      >
                        {createSchedaAlunno.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Crea scheda alunno
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2 border-t pt-3">
                    <Label>Voci di programma</Label>
                    <SchedaAlunnoVociEditor
                      schedaAlunnoId={scheda?.id ?? null}
                      voci={scheda?.voci ?? []}
                      tipoCorsoCodice={iscrizione?.corso?.tipo_corso?.codice ?? 0}
                    />
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <Label>Materiale didattico</Label>
                    <SchedaAlunnoMaterialiEditor
                      schedaAlunnoId={scheda?.id ?? null}
                      materiali={scheda?.materiali ?? []}
                    />
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <Label>Note dell'alunno</Label>
                    <p className="text-xs text-muted-foreground">
                      Autovalutazioni scritte dall'alunno nel portale, sola lettura da qui.
                    </p>
                    <AutovalutazioniLog
                      iscrizioneCorsoId={iscrizione?.id ?? 0}
                      autovalutazioni={scheda?.autovalutazioni ?? []}
                      readOnly
                    />
                  </div>
                </>
              )}
            </fieldset>
          )}

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
