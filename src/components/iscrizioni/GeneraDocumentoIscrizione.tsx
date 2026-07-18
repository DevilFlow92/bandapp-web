import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Loader2 } from "lucide-react"
import {
  useGenerateDocx,
  useGeneratePdf,
  usePreviewTemplate,
  useTemplates,
} from "@/hooks/useModulistica"
import { useCollegaDocumentoAIscrizione } from "@/hooks/useCollegaDocumentoAIscrizione"
import { downloadDocumento, isPreviewable, previewDocumento } from "@/hooks/useDocumenti"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Template } from "@/types/modulistica"
import type { Documento } from "@/types/documento"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import EntitySelector from "@/components/modulistica/EntitySelector"
import TemplatePreviewPane from "@/components/modulistica/TemplatePreviewPane"

const TEMPLATES_PAGE_SIZE = 50
const DEFAULT_TEMPLATE_NOME = "Modulo Iscrizione Associazione"

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  )
}

interface GeneraDocumentoIscrizioneProps {
  socioId: number
  iscrizioneId: number
  bandaCodice: number
  documentoAttuale?: { id: number; nome: string } | null
  onDocumentoCollegato?: (documento: Documento, templateNome: string) => void
  onTemplateSelezionatoChange?: (selezionato: boolean) => void
}

/**
 * Generates a documento from a template (scoped to socio/banda/iscrizione, all
 * read-only) and links it to the iscrizione via useCollegaDocumentoAIscrizione.
 */
export default function GeneraDocumentoIscrizione({
  socioId,
  iscrizioneId,
  bandaCodice,
  documentoAttuale,
  onDocumentoCollegato,
  onTemplateSelezionatoChange,
}: GeneraDocumentoIscrizioneProps) {
  const { toast } = useToast()
  const { collega } = useCollegaDocumentoAIscrizione()

  const templatesQuery = useTemplates(1, TEMPLATES_PAGE_SIZE)
  const templatesDisponibili = useMemo(
    () => (templatesQuery.data?.items ?? []).filter((t) => !t.entita_richieste.includes("esterno")),
    [templatesQuery.data],
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [defaultTemplateApplied, setDefaultTemplateApplied] = useState(false)
  const selectedTemplate = templatesDisponibili.find((t) => t.id === selectedTemplateId) ?? null
  const [docEntities, setDocEntities] = useState<Record<string, number>>({})
  const [documentoGenerato, setDocumentoGenerato] = useState<Documento | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previewTemplate = usePreviewTemplate()
  const generateDocx = useGenerateDocx()
  const generatePdf = useGeneratePdf()

  useEffect(() => {
    onTemplateSelezionatoChange?.(selectedTemplate != null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate != null])

  const isDocEntitiesComplete =
    !!selectedTemplate &&
    selectedTemplate.entita_richieste.length > 0 &&
    selectedTemplate.entita_richieste.every((entita) => docEntities[entita] != null)

  const previewMutateRef = useRef(previewTemplate.mutate)
  useEffect(() => {
    previewMutateRef.current = previewTemplate.mutate
  }, [previewTemplate.mutate])

  useEffect(() => {
    if (!selectedTemplate || !isDocEntitiesComplete) return
    previewMutateRef.current({
      id: selectedTemplate.id,
      contenuto_json: selectedTemplate.contenuto_json,
      entities: docEntities,
    })
  }, [selectedTemplate, docEntities, isDocEntitiesComplete])

  // Keeps docEntities in sync with the fixed socio/banda/iscrizione context of this
  // component, without touching entities the user picks manually (e.g. contatto).
  useEffect(() => {
    if (!selectedTemplate) return
    setDocEntities((prev) => {
      const next = { ...prev }
      let changed = false
      if (selectedTemplate.entita_richieste.includes("socio") && next.socio !== socioId) {
        next.socio = socioId
        changed = true
      }
      if (selectedTemplate.entita_richieste.includes("banda") && next.banda !== bandaCodice) {
        next.banda = bandaCodice
        changed = true
      }
      if (
        selectedTemplate.entita_richieste.includes("iscrizione") &&
        next.iscrizione !== iscrizioneId
      ) {
        next.iscrizione = iscrizioneId
        changed = true
      }
      return changed ? next : prev
    })
  }, [selectedTemplate, socioId, iscrizioneId, bandaCodice])

  useEffect(() => {
    if (defaultTemplateApplied || templatesQuery.isLoading || selectedTemplateId != null) return
    setDefaultTemplateApplied(true)
    const defaultTemplate = templatesDisponibili.find((t) => t.nome === DEFAULT_TEMPLATE_NOME)
    if (defaultTemplate) handleSelectTemplate(defaultTemplate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesDisponibili, defaultTemplateApplied, templatesQuery.isLoading, selectedTemplateId])

  function handleSelectTemplate(template: Template) {
    const initial: Record<string, number> = {}
    if (template.entita_richieste.includes("socio")) initial.socio = socioId
    if (template.entita_richieste.includes("banda")) initial.banda = bandaCodice
    if (template.entita_richieste.includes("iscrizione")) initial.iscrizione = iscrizioneId
    setSelectedTemplateId(template.id)
    setDocEntities(initial)
    setDocumentoGenerato(null)
    setError(null)
  }

  async function handleGenerateDocumento(kind: "docx" | "pdf") {
    if (!selectedTemplate) return
    setError(null)
    try {
      const mutateAsync = kind === "docx" ? generateDocx.mutateAsync : generatePdf.mutateAsync
      const documento = await mutateAsync({
        id: selectedTemplate.id,
        contenuto_json: selectedTemplate.contenuto_json,
        entities: docEntities,
      })
      setDocumentoGenerato(documento)
      toast({ title: "Documento generato" })
      const linked = await collega({ iscrizioneId, documentoId: documento.id, documentoAttuale })
      if (linked) onDocumentoCollegato?.(documento, selectedTemplate.nome)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}

      {!selectedTemplate ? (
        templatesQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Caricamento moduli…
          </div>
        ) : templatesDisponibili.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun modulo configurato per questo tipo di iscrizione.{" "}
            <Link to="/modulistica" className="underline">
              Vai a Modulistica
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            <Label>Modulo</Label>
            <Select
              value={selectedTemplateId != null ? String(selectedTemplateId) : undefined}
              onValueChange={(value) => {
                const template = templatesDisponibili.find((t) => t.id === Number(value))
                if (template) handleSelectTemplate(template)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un modulo…" />
              </SelectTrigger>
              <SelectContent>
                {templatesDisponibili.map((template) => (
                  <SelectItem key={template.id} value={String(template.id)}>
                    {template.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{selectedTemplate.nome}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTemplateId(null)
                setDocumentoGenerato(null)
                setError(null)
              }}
            >
              Cambia modulo
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <EntitySelector
                contenutoJson={selectedTemplate.contenuto_json}
                value={docEntities}
                onChange={setDocEntities}
                readOnlyEntities={["socio", "banda", "iscrizione"]}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleGenerateDocumento("docx")}
                  disabled={!isDocEntitiesComplete || generateDocx.isPending}
                >
                  {generateDocx.isPending ? "Generazione..." : "Genera DOCX"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleGenerateDocumento("pdf")}
                  disabled={!isDocEntitiesComplete || generatePdf.isPending}
                >
                  {generatePdf.isPending ? "Generazione..." : "Genera PDF"}
                </Button>
              </div>

              {documentoGenerato && (
                <div className="space-y-2 rounded-md border p-3 text-sm">
                  <p className="font-medium">Documento generato: {documentoGenerato.nome}</p>
                  <div className="flex gap-2">
                    {isPreviewable(documentoGenerato.mime_type) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => previewDocumento(documentoGenerato.id)}
                      >
                        Visualizza
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadDocumento(documentoGenerato.id, documentoGenerato.nome)
                      }
                    >
                      Scarica
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <TemplatePreviewPane
              html={previewTemplate.data?.html}
              isLoading={previewTemplate.isPending}
              error={previewTemplate.isError ? getErrorMessage(previewTemplate.error) : null}
              isReady={isDocEntitiesComplete}
            />
          </div>
        </div>
      )}
    </div>
  )
}
