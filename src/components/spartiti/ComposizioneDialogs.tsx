import { useState } from "react"
import { Trash2 } from "lucide-react"
import {
  useCreateNomeParte,
  useUpdateNomeParte,
  useCreateSpartito,
  useLookupTipiSpartito,
  useUploadAudioNomeParte,
  useDeleteAudioNomeParte,
  type CreateNomeParteInput,
  type UpdateNomeParteInput,
} from "@/hooks/useSpartiti"
import { useLookupStrumenti } from "@/hooks/useSoci"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useConfirm } from "@/hooks/useConfirm"
import { useBanda } from "@/context/BandaContext"
import type { NomeParte } from "@/types/spartito"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const NONE_VALUE = "__none__"

const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

interface ComposizioneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NuovaComposizioneDialog({ open, onOpenChange }: ComposizioneDialogProps) {
  const { toast } = useToast()
  const { banda } = useBanda()
  const create = useCreateNomeParte()
  const uploadAudio = useUploadAudioNomeParte()
  const tipi = useLookupTipiSpartito()
  const [nome, setNome] = useState("")
  const [tipo, setTipo] = useState("")
  const [url, setUrl] = useState("")
  const [note, setNote] = useState("")
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const reset = () => {
    setNome("")
    setTipo("")
    setUrl("")
    setNote("")
    setAudioFile(null)
  }

  const handleSubmit = async () => {
    if (!nome.trim() || !tipo) {
      toast({ variant: "destructive", title: "Nome e tipo sono obbligatori." })
      return
    }
    const input: CreateNomeParteInput = {
      nome: nome.trim(),
      tipo_spartito_codice: Number(tipo),
      banda_codice: banda!.codice,
      url_riferimento: url.trim() || null,
      note: note.trim() || null,
    }
    try {
      const newNomeParte = await create.mutateAsync(input)
      if (audioFile) {
        await uploadAudio.mutateAsync({ id: newNomeParte.id, file: audioFile })
      }
      reset()
      onOpenChange(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova composizione</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="np-nome">Nome *</Label>
            <Input id="np-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Tipo spartito *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona…" />
              </SelectTrigger>
              <SelectContent>
                {tipi.data?.map((t) => (
                  <SelectItem key={t.codice} value={String(t.codice)}>
                    {t.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="np-url">URL riferimento</Label>
            <Input
              id="np-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="np-note">Note</Label>
            <textarea
              id="np-note"
              className={TEXTAREA_CLASS}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="np-audio">File audio (opzionale)</Label>
            <input
              id="np-audio"
              type="file"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              accept="audio/*,video/*,.mp3,.mp4,.wav,.ogg,.flac,.aac"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              mp3, mp4, wav e altri formati audio/video
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            Crea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ModificaDialogProps extends ComposizioneDialogProps {
  nomeParte: NomeParte
}

export function ModificaComposizioneDialog({ nomeParte, open, onOpenChange }: ModificaDialogProps) {
  const { toast } = useToast()
  const confirm = useConfirm()
  const update = useUpdateNomeParte()
  const uploadAudio = useUploadAudioNomeParte()
  const deleteAudio = useDeleteAudioNomeParte()
  const tipi = useLookupTipiSpartito()
  const [nome, setNome] = useState(nomeParte.nome)
  const [tipo, setTipo] = useState(String(nomeParte.tipo_spartito_codice))
  const [url, setUrl] = useState(nomeParte.url_riferimento ?? "")
  const [note, setNote] = useState(nomeParte.note ?? "")
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const handleSubmit = async () => {
    if (!nome.trim() || !tipo) {
      toast({ variant: "destructive", title: "Nome e tipo sono obbligatori." })
      return
    }
    const input: UpdateNomeParteInput = {
      nome: nome.trim(),
      tipo_spartito_codice: Number(tipo),
      url_riferimento: url.trim() || null,
      note: note.trim() || null,
    }
    try {
      await update.mutateAsync({ id: nomeParte.id, input })
      if (audioFile) {
        await uploadAudio.mutateAsync({ id: nomeParte.id, file: audioFile })
      }
      onOpenChange(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setAudioFile(null)
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica composizione</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mc-nome">Nome *</Label>
            <Input id="mc-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Tipo spartito *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona…" />
              </SelectTrigger>
              <SelectContent>
                {tipi.data?.map((t) => (
                  <SelectItem key={t.codice} value={String(t.codice)}>
                    {t.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mc-url">URL riferimento</Label>
            <Input
              id="mc-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mc-note">Note</Label>
            <textarea
              id="mc-note"
              className={TEXTAREA_CLASS}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>File audio</Label>
            {nomeParte.documento_audio_id != null && !audioFile && (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {nomeParte.documento_audio?.nome ?? "File audio caricato"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0 text-destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Eliminare il file audio?",
                      description:
                        "Il file audio verrà rimosso definitivamente, l'operazione non è reversibile.",
                      variant: "destructive",
                    })
                    if (!ok) return
                    deleteAudio.mutate(nomeParte.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <input
              type="file"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              accept="audio/*,video/*,.mp3,.mp4,.wav,.ogg,.flac,.aac"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            />
            {nomeParte.documento_audio_id == null && !audioFile && (
              <p className="text-xs text-muted-foreground">Nessun file audio — opzionale</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={update.isPending}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AggiuntaParteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nomeParte: NomeParte
}

export function AggiuntaParteDialog({ open, onOpenChange, nomeParte }: AggiuntaParteDialogProps) {
  const { toast } = useToast()
  const create = useCreateSpartito()
  const strumenti = useLookupStrumenti()
  const [strumento, setStrumento] = useState(NONE_VALUE)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [scaffale, setScaffale] = useState("")
  const [ripiano, setRipiano] = useState("")
  const [cartella, setCartella] = useState("")

  const reset = () => {
    setStrumento(NONE_VALUE)
    setFile(null)
    setNote("")
    setScaffale("")
    setRipiano("")
    setCartella("")
  }

  const handleSubmit = async () => {
    try {
      await create.mutateAsync({
        nome_parte_id: nomeParte.id,
        banda_codice: nomeParte.banda_codice,
        tipo_spartito_codice: nomeParte.tipo_spartito_codice,
        strumento_codice: strumento === NONE_VALUE ? null : Number(strumento),
        file: file ?? null,
        note: note.trim() || null,
        scaffale: scaffale.trim() || null,
        ripiano: ripiano.trim() || null,
        cartella: cartella.trim() || null,
      })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi parte</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Strumento</Label>
            <Select value={strumento} onValueChange={setStrumento}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Partitura completa</SelectItem>
                {strumenti.data?.map((s) => (
                  <SelectItem key={s.codice} value={String(s.codice)}>
                    {s.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ap-file">File (opzionale)</Label>
            <Input
              id="ap-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ap-note">Note</Label>
            <textarea
              id="ap-note"
              className={TEXTAREA_CLASS}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="ap-scaffale">Scaffale</Label>
              <Input
                id="ap-scaffale"
                value={scaffale}
                onChange={(e) => setScaffale(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap-ripiano">Ripiano</Label>
              <Input id="ap-ripiano" value={ripiano} onChange={(e) => setRipiano(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap-cartella">Cartella</Label>
              <Input
                id="ap-cartella"
                value={cartella}
                onChange={(e) => setCartella(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
