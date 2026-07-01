import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FolderOpen,
  Lock,
  Plus,
  Trash2,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useAuth"
import {
  useMacroSezioni,
  useSottoCartelle,
  useCreateSottoCartella,
  useDeleteSottoCartella,
} from "@/hooks/useArchivio"
import {
  useDocumenti,
  useUploadDocumento,
  useDeleteDocumento,
  previewDocumento,
  downloadDocumento,
} from "@/hooks/useDocumenti"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { MacroSezione, SottoCartella } from "@/types/archivio"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PAGE_SIZE = 20

function isPreviewable(mimeType: string | undefined | null): boolean {
  if (!mimeType) return false
  return mimeType === "application/pdf" || mimeType.startsWith("image/")
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT")
}

export default function DocumentiPage() {
  const { data: user } = useCurrentUser()
  const hasPermission = (codice: string) =>
    user?.superuser === true || user?.permessi?.includes(codice) === true

  const [selectedMacroSezione, setSelectedMacroSezione] = useState<MacroSezione | null>(null)
  const [selectedSottoCartella, setSelectedSottoCartella] = useState<SottoCartella | null>(null)
  const [page, setPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [nuovaCartellaOpen, setNuovaCartellaOpen] = useState(false)

  const { data: macroSezioni, isLoading: macroLoading } = useMacroSezioni()
  const { data: sottoCartelle, isLoading: sottoLoading } = useSottoCartelle(
    selectedMacroSezione?.codice ?? null,
  )
  const deleteSottoCartella = useDeleteSottoCartella()
  const deleteDocumento = useDeleteDocumento()

  const canReadSelected = selectedMacroSezione
    ? hasPermission(`${selectedMacroSezione.permesso_prefisso}:read`)
    : true
  const canWriteSelected = selectedMacroSezione
    ? hasPermission(`${selectedMacroSezione.permesso_prefisso}:write`)
    : false

  const { data, isLoading } = useDocumenti(page, PAGE_SIZE, undefined, selectedSottoCartella?.id)
  const totalPages = data?.meta.total_pages ?? 1

  const selectTutti = () => {
    setSelectedMacroSezione(null)
    setSelectedSottoCartella(null)
    setPage(1)
  }

  const selectMacroSezione = (ms: MacroSezione) => {
    setSelectedMacroSezione(ms)
    setSelectedSottoCartella(null)
    setPage(1)
  }

  const selectSottoCartella = (sc: SottoCartella) => {
    setSelectedSottoCartella(sc)
    setPage(1)
  }

  // View resolution for the content area.
  const showDocumenti = selectedMacroSezione === null || selectedSottoCartella !== null
  const canWriteHere = canWriteSelected
  const isTutti = selectedMacroSezione === null && selectedSottoCartella === null
  const isUnderMacroSezione = selectedMacroSezione !== null && selectedSottoCartella === null
  const showSezioneCartella = isTutti || isUnderMacroSezione
  const numTableCols = showSezioneCartella ? 6 : 4

  const itemClass = (active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
      active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60",
    )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Documenti</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar — macro-sezioni navigation */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-md border p-2">
            <div className={itemClass(selectedMacroSezione === null)} onClick={selectTutti}>
              <FolderOpen className="h-4 w-4 shrink-0" />
              Tutti i documenti
            </div>

            {macroLoading ? (
              <div className="space-y-1 px-1 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              (macroSezioni ?? []).map((ms) => {
                const active = selectedMacroSezione?.codice === ms.codice
                const canRead = hasPermission(`${ms.permesso_prefisso}:read`)
                const canWrite = hasPermission(`${ms.permesso_prefisso}:write`)
                return (
                  <div key={ms.codice}>
                    <div
                      className={cn(itemClass(active), !canRead && "opacity-60")}
                      onClick={() => selectMacroSezione(ms)}
                    >
                      {!canRead && <Lock className="h-4 w-4 shrink-0" />}
                      <span className="flex-1 truncate">{ms.nome}</span>
                      {active && canWrite && (
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-muted-foreground/10"
                          aria-label="Nuova cartella"
                          onClick={(e) => {
                            e.stopPropagation()
                            setNuovaCartellaOpen(true)
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {active && canRead && (
                      <div className="ml-4 space-y-1 border-l pl-2">
                        {sottoLoading ? (
                          Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton key={i} className="h-7 w-full" />
                          ))
                        ) : (sottoCartelle ?? []).length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">
                            Nessuna cartella.
                          </p>
                        ) : (
                          (sottoCartelle ?? []).map((sc) => (
                            <div
                              key={sc.id}
                              className={itemClass(selectedSottoCartella?.id === sc.id)}
                              onClick={() => selectSottoCartella(sc)}
                            >
                              <span className="flex-1 truncate">{sc.nome}</span>
                              {canWrite && (
                                <button
                                  type="button"
                                  className="rounded p-1 hover:bg-muted-foreground/10"
                                  aria-label="Elimina cartella"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (selectedSottoCartella?.id === sc.id) {
                                      setSelectedSottoCartella(null)
                                    }
                                    deleteSottoCartella.mutate(sc.id)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* Content area */}
        <div className="min-w-0 flex-1 space-y-4">
          {selectedMacroSezione !== null && !canReadSelected ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
              <Lock className="h-10 w-10" />
              <p>Non hai i permessi per visualizzare questa sezione.</p>
            </div>
          ) : !showDocumenti ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
              <FolderOpen className="h-10 w-10" />
              <p>Seleziona una cartella per visualizzare i documenti.</p>
              {canWriteHere && (
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Carica documento
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedSottoCartella?.nome ?? "Tutti i documenti"}
                </p>
                {canWriteHere && (
                  <Button size="sm" onClick={() => setUploadOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Carica documento
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      {showSezioneCartella && (
                        <>
                          <TableHead>Sezione</TableHead>
                          <TableHead>Cartella</TableHead>
                        </>
                      )}
                      <TableHead>Caricato il</TableHead>
                      <TableHead className="text-right">Dimensione</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: numTableCols }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (data?.items ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={numTableCols}
                          className="py-12 text-center text-muted-foreground"
                        >
                          <FolderOpen className="mx-auto mb-2 h-8 w-8" />
                          Nessun documento.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (data?.items ?? []).map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="max-w-xs truncate" title={doc.nome}>
                            {doc.nome}
                          </TableCell>
                          {showSezioneCartella && (
                            <>
                              <TableCell>
                                {macroSezioni?.find(
                                  (ms) => ms.codice === doc.sotto_cartella?.macro_sezione_codice,
                                )?.nome ?? "—"}
                              </TableCell>
                              <TableCell>{doc.sotto_cartella?.nome ?? "—"}</TableCell>
                            </>
                          )}
                          <TableCell className="whitespace-nowrap">
                            {formatDate(doc.caricato_il)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatBytes(doc.dimensione_bytes)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {isPreviewable(doc.mime_type) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => previewDocumento(doc.id)}
                                  aria-label="Anteprima"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => downloadDocumento(doc.id, doc.nome)}
                                aria-label="Scarica"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {canWriteHere && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteDocumento.mutate(doc.id)}
                                  aria-label="Elimina"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Pagina {data?.meta.page ?? page} di {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || isLoading}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Precedente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isLoading}
                  >
                    Successiva
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedMacroSezione && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          sottoCartellaId={selectedSottoCartella?.id}
        />
      )}
      {selectedMacroSezione && (
        <NuovaCartellaDialog
          open={nuovaCartellaOpen}
          onOpenChange={setNuovaCartellaOpen}
          macroSezioneCodice={selectedMacroSezione.codice}
        />
      )}
    </div>
  )
}

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sottoCartellaId: number | undefined
}

function UploadDialog({ open, onOpenChange, sottoCartellaId }: UploadDialogProps) {
  const { toast } = useToast()
  const upload = useUploadDocumento()
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")

  const reset = () => {
    setFile(null)
    setNote("")
  }

  const handleSubmit = async () => {
    if (!file) {
      toast({ variant: "destructive", title: "Seleziona un file da caricare." })
      return
    }
    try {
      await upload.mutateAsync({
        file,
        note: note.trim() || undefined,
        sotto_cartella_id: sottoCartellaId,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Carica documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">File</label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.mp3,.mp4,.wav,.ogg,.flac,.xml,.mxl,.musicxml,.zip,.rar,.7z"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Note (opzionale)</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={upload.isPending}>
            Carica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface NuovaCartellaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  macroSezioneCodice: number
}

function NuovaCartellaDialog({ open, onOpenChange, macroSezioneCodice }: NuovaCartellaDialogProps) {
  const { toast } = useToast()
  const create = useCreateSottoCartella()
  const [nome, setNome] = useState("")

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast({ variant: "destructive", title: "Il nome della cartella è obbligatorio." })
      return
    }
    try {
      await create.mutateAsync({ nome: nome.trim(), macro_sezione_codice: macroSezioneCodice })
      setNome("")
      onOpenChange(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setNome("")
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuova cartella</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome</label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
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
