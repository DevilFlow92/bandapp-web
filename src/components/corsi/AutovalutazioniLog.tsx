import { useState } from "react"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import {
  useCreateAutovalutazione,
  useDeleteAutovalutazione,
  useUpdateAutovalutazione,
} from "@/hooks/usePortaleAlunno"
import { useConfirm } from "@/hooks/useConfirm"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import type { SchedaAlunnoAutovalutazione } from "@/types/scheda_alunno_autovalutazione"
import { Button } from "@/components/ui/button"

interface AutovalutazioniLogProps {
  iscrizioneCorsoId: number
  autovalutazioni: SchedaAlunnoAutovalutazione[]
  /** false solo nel portale alunno, dove l'autore vede i controlli di scrittura sulle proprie voci; true ovunque altro (es. pannello insegnante), sola lettura. */
  readOnly: boolean
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })
}

const textareaClass =
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

export default function AutovalutazioniLog({
  iscrizioneCorsoId,
  autovalutazioni,
  readOnly,
}: AutovalutazioniLogProps) {
  const { toast } = useToast()
  const confirm = useConfirm()

  const createAutovalutazione = useCreateAutovalutazione()
  const updateAutovalutazione = useUpdateAutovalutazione()
  const deleteAutovalutazione = useDeleteAutovalutazione()

  const [nuovoTesto, setNuovoTesto] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTesto, setEditTesto] = useState("")

  const handleAdd = async () => {
    const testo = nuovoTesto.trim()
    if (!testo) return
    try {
      await createAutovalutazione.mutateAsync({ iscrizioneCorsoId, testo })
      setNuovoTesto("")
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  const startEdit = (voce: SchedaAlunnoAutovalutazione) => {
    setEditingId(voce.id)
    setEditTesto(voce.testo)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTesto("")
  }

  const handleSaveEdit = async (voce: SchedaAlunnoAutovalutazione) => {
    const testo = editTesto.trim()
    if (!testo) return
    if (testo === voce.testo) {
      cancelEdit()
      return
    }
    try {
      await updateAutovalutazione.mutateAsync({
        iscrizioneCorsoId,
        autovalutazioneId: voce.id,
        testo,
      })
      cancelEdit()
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  const handleRemove = async (voce: SchedaAlunnoAutovalutazione) => {
    const ok = await confirm({
      title: "Rimuovi nota",
      description: "Rimuovere questa nota di autovalutazione?",
      confirmLabel: "Rimuovi",
      variant: "destructive",
    })
    if (!ok) return
    deleteAutovalutazione.mutate(
      { iscrizioneCorsoId, autovalutazioneId: voce.id },
      {
        onError: (err) => {
          toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
        },
      },
    )
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="space-y-2 rounded-md border p-3">
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="Scrivi una nuova nota…"
            value={nuovoTesto}
            disabled={createAutovalutazione.isPending}
            onChange={(e) => setNuovoTesto(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={!nuovoTesto.trim() || createAutovalutazione.isPending}
            onClick={handleAdd}
          >
            {createAutovalutazione.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aggiungi nota
          </Button>
        </div>
      )}

      {autovalutazioni.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna nota inserita.</p>
      ) : (
        autovalutazioni.map((voce) => (
          <div key={voce.id} className="space-y-2 rounded-md border p-3">
            {editingId === voce.id ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  className={textareaClass}
                  value={editTesto}
                  disabled={updateAutovalutazione.isPending}
                  onChange={(e) => setEditTesto(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={updateAutovalutazione.isPending}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!editTesto.trim() || updateAutovalutazione.isPending}
                    onClick={() => handleSaveEdit(voce)}
                  >
                    {updateAutovalutazione.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salva
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="whitespace-pre-wrap text-sm">{voce.testo}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatData(voce.data_creazione)}
                    {voce.data_modifica && ` · modificata il ${formatData(voce.data_modifica)}`}
                  </p>
                </div>
                {!readOnly && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEdit(voce)}
                      aria-label="Modifica"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemove(voce)}
                      disabled={deleteAutovalutazione.isPending}
                      aria-label="Rimuovi"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
