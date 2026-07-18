import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import {
  downloadDocumento,
  useGenerateDocx,
  useGeneratePdf,
  usePreviewTemplate,
  useTemplate,
  useUpdateTemplate,
} from "@/hooks/useModulistica"
import { useSocio } from "@/hooks/useSoci"
import { useEsterno } from "@/hooks/useEsterni"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import TemplateEditor from "@/components/modulistica/TemplateEditor"
import EntitySelector from "@/components/modulistica/EntitySelector"
import TemplatePreviewPane from "@/components/modulistica/TemplatePreviewPane"
import CartellaOutputSelector from "@/components/modulistica/CartellaOutputSelector"
import GenerateFileDialog from "@/components/modulistica/GenerateFileDialog"

function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_")
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function formatDateForFileName(date: Date): string {
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())
  return `${y}${m}${d}_${h}${min}`
}

export default function TemplateEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const templateId = Number(id)

  const { data: template, isLoading, isError } = useTemplate(templateId)
  const updateTemplate = useUpdateTemplate()
  const previewTemplate = usePreviewTemplate()
  const generateDocx = useGenerateDocx()
  const generatePdf = useGeneratePdf()
  const { toast } = useToast()

  const [contenutoJson, setContenutoJson] = useState<object | null>(null)
  const [entities, setEntities] = useState<Record<string, number>>({})
  const [sottoCartellaId, setSottoCartellaId] = useState<number | null | undefined>(undefined)
  const [generateFormato, setGenerateFormato] = useState<"docx" | "pdf" | null>(null)

  const { data: socioSelezionato } = useSocio(entities.socio ?? 0)
  const { data: esternoSelezionato } = useEsterno(entities.esterno ?? 0)

  const effectiveContent = contenutoJson ?? template?.contenuto_json ?? null
  const effectiveSottoCartellaId =
    sottoCartellaId !== undefined ? sottoCartellaId : (template?.sotto_cartella_id ?? null)

  const previewMutateRef = useRef(previewTemplate.mutate)
  useEffect(() => {
    previewMutateRef.current = previewTemplate.mutate
  }, [previewTemplate.mutate])

  useEffect(() => {
    if (!template || !effectiveContent) return
    previewMutateRef.current({ id: template.id, contenuto_json: effectiveContent, entities })
  }, [template, effectiveContent, entities])

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit text-muted-foreground"
      onClick={() => navigate("/modulistica")}
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      Modulistica
    </Button>
  )

  async function handleSave() {
    if (!template) return
    try {
      const input: Record<string, unknown> = { sotto_cartella_id: effectiveSottoCartellaId }
      if (contenutoJson) input.contenuto_json = contenutoJson
      await updateTemplate.mutateAsync({
        id: templateId,
        input,
      })
      toast({ title: "Modulo salvato" })
    } catch {
      toast({ variant: "destructive", title: "Errore durante il salvataggio. Riprova." })
    }
  }

  function computeNomeProposto() {
    if (!template) return ""
    const persona = socioSelezionato?.persona ?? esternoSelezionato?.persona
    const identificativo = persona ? `${persona.cognome}_${persona.nome}` : null
    const parti = [template.nome, identificativo, formatDateForFileName(new Date())].filter(
      (parte): parte is string => !!parte,
    )
    return sanitizeFileName(parti.join("_"))
  }

  async function handleConfirmGenerate(nomeFile: string) {
    if (!template || !effectiveContent || !generateFormato) return
    const mutation = generateFormato === "docx" ? generateDocx : generatePdf
    try {
      const documento = await mutation.mutateAsync({
        id: template.id,
        contenuto_json: effectiveContent,
        entities,
        nome_file: nomeFile || undefined,
      })
      setGenerateFormato(null)
      await downloadDocumento(documento.id, documento.nome)
    } catch (err) {
      toast({ variant: "destructive", title: getErrorMessage(err) })
    }
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {backButton}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Errore nel caricamento del modulo.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {backButton}
        <Button onClick={handleSave} disabled={updateTemplate.isPending || !template}>
          {updateTemplate.isPending ? "Salvataggio..." : "Salva"}
        </Button>
      </div>

      {isLoading || !template ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">{template.nome}</h1>
          <div className="max-w-sm">
            <CartellaOutputSelector
              value={effectiveSottoCartellaId}
              onChange={setSottoCartellaId}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <TemplateEditor
              key={template.id}
              initialContent={template.contenuto_json}
              onChange={setContenutoJson}
            />

            <div className="space-y-4">
              <EntitySelector
                contenutoJson={effectiveContent}
                value={entities}
                onChange={setEntities}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setGenerateFormato("docx")}
                  disabled={!effectiveContent || generateDocx.isPending}
                >
                  {generateDocx.isPending ? "Generazione..." : "Genera DOCX"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setGenerateFormato("pdf")}
                  disabled={!effectiveContent || generatePdf.isPending}
                >
                  {generatePdf.isPending ? "Generazione..." : "Genera PDF"}
                </Button>
              </div>

              <TemplatePreviewPane
                html={previewTemplate.data?.html}
                isLoading={previewTemplate.isPending}
                error={previewTemplate.isError ? getErrorMessage(previewTemplate.error) : null}
                isReady={effectiveContent != null}
              />
            </div>
          </div>
        </div>
      )}

      {generateFormato && (
        <GenerateFileDialog
          open
          onOpenChange={(open) => !open && setGenerateFormato(null)}
          formato={generateFormato}
          nomeProposto={computeNomeProposto()}
          onConfirm={handleConfirmGenerate}
        />
      )}
    </div>
  )
}
