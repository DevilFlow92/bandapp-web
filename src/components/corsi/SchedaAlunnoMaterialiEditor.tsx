import { useRef, useState, type ChangeEvent } from "react"
import {
  Download,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import {
  useCreateMaterialeLink,
  useDeleteMateriale,
  useUploadMaterialeFile,
  downloadMateriale,
} from "@/hooks/useSchedeAlunno"
import { useConfirm } from "@/hooks/useConfirm"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import type { SchedaAlunnoMateriale } from "@/types/scheda_alunno_materiale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Whitelist e limite di dimensione replicati lato client dal backend
// (`ESTENSIONI_AMMESSE`/`DIMENSIONE_MASSIMA_BYTES` in
// scheda_alunno_materiale_service.py) per bloccare gli invii non validi
// prima della chiamata al server.
const ESTENSIONI_AMMESSE = [
  "pdf",
  "docx",
  "jpg",
  "jpeg",
  "png",
  "mp3",
  "m4a",
  "wav",
  "avi",
  "mp4",
  "mscz",
  "sib",
]
const DIMENSIONE_MASSIMA_BYTES = 20 * 1024 * 1024

interface SchedaAlunnoMaterialiEditorProps {
  /** null finché la scheda alunno non è ancora stata creata: i materiali sono annidati sotto lo scheda_alunno_id. */
  schedaAlunnoId: number | null
  materiali: SchedaAlunnoMateriale[]
}

function estensione(nomeFile: string): string {
  const idx = nomeFile.lastIndexOf(".")
  return idx >= 0 ? nomeFile.slice(idx + 1).toLowerCase() : ""
}

function nomeSenzaEstensione(nomeFile: string): string {
  const idx = nomeFile.lastIndexOf(".")
  return idx > 0 ? nomeFile.slice(0, idx) : nomeFile
}

function validaFile(file: File): string | null {
  const ext = estensione(file.name)
  if (!ESTENSIONI_AMMESSE.includes(ext)) {
    return `Estensione "${ext || "sconosciuta"}" non ammessa. Estensioni valide: ${ESTENSIONI_AMMESSE.join(", ")}.`
  }
  if (file.size > DIMENSIONE_MASSIMA_BYTES) {
    return "Il file supera la dimensione massima di 20MB."
  }
  return null
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export default function SchedaAlunnoMaterialiEditor({
  schedaAlunnoId,
  materiali,
}: SchedaAlunnoMaterialiEditorProps) {
  const { toast } = useToast()
  const confirm = useConfirm()

  const uploadFile = useUploadMaterialeFile()
  const createLink = useCreateMaterialeLink()
  const deleteMateriale = useDeleteMateriale()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileTitolo, setFileTitolo] = useState("")
  const [fileError, setFileError] = useState<string | null>(null)

  const [addingLink, setAddingLink] = useState(false)
  const [linkTitolo, setLinkTitolo] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkError, setLinkError] = useState<string | null>(null)

  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  if (schedaAlunnoId == null) {
    return (
      <p className="text-sm text-muted-foreground">
        Crea la scheda alunno per aggiungere materiale didattico.
      </p>
    )
  }

  const resetFileForm = () => {
    setSelectedFile(null)
    setFileTitolo("")
    setFileError(null)
  }

  const resetLinkForm = () => {
    setAddingLink(false)
    setLinkTitolo("")
    setLinkUrl("")
    setLinkError(null)
  }

  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ""
    if (!file) return
    const validationError = validaFile(file)
    if (validationError) {
      setFileError(validationError)
      setSelectedFile(null)
      return
    }
    setFileError(null)
    setSelectedFile(file)
    setFileTitolo(nomeSenzaEstensione(file.name))
  }

  const handleUploadConfirm = async () => {
    if (!selectedFile || !fileTitolo.trim()) return
    try {
      await uploadFile.mutateAsync({
        schedaAlunnoId,
        titolo: fileTitolo.trim(),
        file: selectedFile,
      })
      resetFileForm()
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  const handleLinkConfirm = async () => {
    const titolo = linkTitolo.trim()
    const url = linkUrl.trim()
    if (!titolo || !url) return
    if (!isValidUrl(url)) {
      setLinkError("Inserisci un URL valido (es. https://esempio.it).")
      return
    }
    setLinkError(null)
    try {
      await createLink.mutateAsync({ schedaAlunnoId, titolo, url })
      resetLinkForm()
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  const handleDownload = async (materiale: SchedaAlunnoMateriale) => {
    setDownloadingId(materiale.id)
    try {
      await downloadMateriale(
        schedaAlunnoId,
        materiale.id,
        materiale.nome_file_originale ?? materiale.titolo,
      )
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    } finally {
      setDownloadingId(null)
    }
  }

  const handleRemove = async (materiale: SchedaAlunnoMateriale) => {
    const ok = await confirm({
      title: "Rimuovi materiale",
      description: `Rimuovere «${materiale.titolo}» dal materiale didattico?`,
      confirmLabel: "Rimuovi",
      variant: "destructive",
    })
    if (!ok) return
    deleteMateriale.mutate(
      { schedaAlunnoId, materialeId: materiale.id },
      {
        onError: (err) => {
          toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
        },
      },
    )
  }

  return (
    <div className="space-y-3">
      {materiali.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun materiale didattico inserito.</p>
      )}

      {materiali.map((materiale) => (
        <div
          key={materiale.id}
          className="flex items-center justify-between gap-2 rounded-md border p-3"
        >
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{materiale.tipo === "file" ? "File" : "Link"}</Badge>
            <span className="font-medium">{materiale.titolo}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {materiale.tipo === "file" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(materiale)}
                disabled={downloadingId === materiale.id}
              >
                {downloadingId === materiale.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Scarica
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" asChild>
                <a href={materiale.url ?? "#"} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Apri
                </a>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleRemove(materiale)}
              disabled={deleteMateriale.isPending}
              aria-label="Rimuovi"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}

      <div className="space-y-2 rounded-md border p-3">
        <p className="text-xs text-muted-foreground">
          Formati ammessi: {ESTENSIONI_AMMESSE.join(", ")}. Dimensione massima 20MB.
        </p>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
        {fileError && (
          <p role="alert" className="text-sm text-destructive">
            {fileError}
          </p>
        )}
        {selectedFile ? (
          <div className="space-y-2">
            <p className="text-sm">
              File selezionato: <span className="font-medium">{selectedFile.name}</span>
            </p>
            <div className="space-y-1">
              <Label htmlFor="materiale-file-titolo" className="text-xs">
                Titolo *
              </Label>
              <Input
                id="materiale-file-titolo"
                className="h-8"
                value={fileTitolo}
                onChange={(e) => setFileTitolo(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFileForm}
                disabled={uploadFile.isPending}
              >
                Annulla
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!fileTitolo.trim() || uploadFile.isPending}
                onClick={handleUploadConfirm}
              >
                {uploadFile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Carica
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Carica file
          </Button>
        )}
      </div>

      {addingLink ? (
        <div className="space-y-2 rounded-md border p-3">
          {linkError && (
            <p role="alert" className="text-sm text-destructive">
              {linkError}
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="materiale-link-titolo" className="text-xs">
              Titolo *
            </Label>
            <Input
              id="materiale-link-titolo"
              className="h-8"
              value={linkTitolo}
              onChange={(e) => setLinkTitolo(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="materiale-link-url" className="text-xs">
              URL *
            </Label>
            <Input
              id="materiale-link-url"
              className="h-8"
              placeholder="https://esempio.it"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetLinkForm}
              disabled={createLink.isPending}
            >
              Annulla
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!linkTitolo.trim() || !linkUrl.trim() || createLink.isPending}
              onClick={handleLinkConfirm}
            >
              {createLink.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAddingLink(true)}>
          <LinkIcon className="mr-2 h-4 w-4" />
          <Plus className="mr-1 h-3 w-3" />
          Aggiungi link
        </Button>
      )}
    </div>
  )
}
