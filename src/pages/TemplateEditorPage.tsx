import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useTemplate, useUpdateTemplate } from "@/hooks/useModulistica"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import TemplateEditor from "@/components/modulistica/TemplateEditor"

export default function TemplateEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const templateId = Number(id)

  const { data: template, isLoading, isError } = useTemplate(templateId)
  const updateTemplate = useUpdateTemplate()
  const { toast } = useToast()

  const [contenutoJson, setContenutoJson] = useState<object | null>(null)

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
    if (!contenutoJson) return
    try {
      await updateTemplate.mutateAsync({
        id: templateId,
        input: { contenuto_json: contenutoJson },
      })
      toast({ title: "Modulo salvato" })
    } catch {
      toast({ variant: "destructive", title: "Errore durante il salvataggio. Riprova." })
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
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{template.nome}</h1>
          <TemplateEditor
            key={template.id}
            initialContent={template.contenuto_json}
            onChange={setContenutoJson}
          />
        </div>
      )}
    </div>
  )
}
