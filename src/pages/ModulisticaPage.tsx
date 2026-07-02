import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  downloadTemplate,
} from "@/hooks/useModulistica"
import type { Template } from "@/types/modulistica"
import { API_URL } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const PAGE_SIZE = 12

function isPreviewable(mimeType: string | undefined | null): boolean {
  if (!mimeType) return false
  return mimeType === "application/pdf" || mimeType.startsWith("image/")
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function NuovoModuloDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [nome, setNome] = useState("")
  const [descrizione, setDescrizione] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const createTemplate = useCreateTemplate()
  const { toast } = useToast()

  function reset() {
    setNome("")
    setDescrizione("")
    setFile(null)
  }

  async function handleSubmit() {
    if (!nome.trim() || !file) {
      toast({ variant: "destructive", title: "Nome e file sono obbligatori." })
      return
    }
    try {
      await createTemplate.mutateAsync({
        file,
        nome: nome.trim(),
        descrizione: descrizione.trim() || null,
      })
      reset()
      onOpenChange(false)
    } catch {
      toast({ variant: "destructive", title: "Errore durante il caricamento. Riprova." })
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
          <DialogTitle>Nuovo modulo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nm-nome">Nome *</Label>
            <Input
              id="nm-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome del modulo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nm-desc">Descrizione</Label>
            <textarea
              id="nm-desc"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Descrizione opzionale"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nm-file">File *</Label>
            <Input
              id="nm-file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.mp3,.mp4,.wav,.xml,.mxl,.musicxml,.zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={createTemplate.isPending}>
            {createTemplate.isPending ? "Caricamento..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModificaModuloDialog({
  template,
  open,
  onOpenChange,
}: {
  template: Template
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [nome, setNome] = useState(template.nome)
  const [descrizione, setDescrizione] = useState(template.descrizione ?? "")
  const updateTemplate = useUpdateTemplate()
  const { toast } = useToast()

  async function handleSubmit() {
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        input: { nome: nome.trim(), descrizione: descrizione.trim() || null },
      })
      onOpenChange(false)
    } catch {
      toast({ variant: "destructive", title: "Errore durante il salvataggio. Riprova." })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica modulo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mm-nome">Nome *</Label>
            <Input id="mm-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mm-desc">Descrizione</Label>
            <textarea
              id="mm-desc"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Per cambiare il file, elimina e ricrea il modulo.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={updateTemplate.isPending}>
            {updateTemplate.isPending ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ModulisticaPage() {
  const [page, setPage] = useState(1)
  const [nuovaOpen, setNuovaOpen] = useState(false)
  const [modificaTarget, setModificaTarget] = useState<Template | null>(null)
  const deleteTemplate = useDeleteTemplate()
  const { data, isLoading } = useTemplates(page, PAGE_SIZE)
  const totalPages = data?.meta.total_pages ?? 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Modulistica</h1>
        <Button onClick={() => setNuovaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuovo modulo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (data?.items ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
          <FileText className="h-10 w-10" />
          <p>Nessun modulo caricato.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(data?.items ?? []).map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold leading-snug">{template.nome}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 pb-2">
                {template.descrizione && (
                  <p
                    className="truncate text-sm text-muted-foreground"
                    title={template.descrizione}
                  >
                    {template.descrizione}
                  </p>
                )}
                {template.documento && (
                  <>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{template.documento.nome}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(template.documento.dimensione_bytes)}
                    </p>
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  Aggiornato il {new Date(template.aggiornato_il).toLocaleDateString("it-IT")}
                </p>
                <div className="flex gap-1 pt-1">
                  {isPreviewable(template.documento?.mime_type) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      aria-label="Anteprima"
                      onClick={() =>
                        window.open(
                          `${API_URL}/documenti/${template.documento_id}/preview`,
                          "_blank",
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {template.documento_id != null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      aria-label="Scarica"
                      onClick={() => downloadTemplate(template.id, template.documento?.nome)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
              <CardFooter className="gap-2 pt-0">
                <Button variant="outline" size="sm" onClick={() => setModificaTarget(template)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Modifica
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteTemplate.mutate(template.id)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Elimina
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (data?.items ?? []).length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {data?.meta.page ?? page} di {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Successiva <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <NuovoModuloDialog open={nuovaOpen} onOpenChange={setNuovaOpen} />
      {modificaTarget && (
        <ModificaModuloDialog
          template={modificaTarget}
          open={Boolean(modificaTarget)}
          onOpenChange={(o) => {
            if (!o) setModificaTarget(null)
          }}
        />
      )}
    </div>
  )
}
