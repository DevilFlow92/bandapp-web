import { useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { useRepertorio, type RepertorioContainer } from "@/hooks/useRepertorio"
import type { RepertorioItem } from "@/types/repertorio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AddBranoRepertorioDialog from "@/components/attivita/AddBranoRepertorioDialog"
import DeleteRepertorioItemDialog from "@/components/attivita/DeleteRepertorioItemDialog"

interface RepertorioWizardStepProps {
  container: RepertorioContainer
  onSkip: () => void
  onContinue: () => void
}

/**
 * Repertorio step of the Servizio/Prova creation wizards: a plain ordered list
 * with add/remove, as opposed to RepertorioPanel which renders the same data
 * as an expandable <TableRow> (with inline reordering) inside the
 * Servizi/Prove tables and so can't be used standalone here.
 */
export default function RepertorioWizardStep({
  container,
  onSkip,
  onContinue,
}: RepertorioWizardStepProps) {
  const { data, isLoading, isError } = useRepertorio(container)
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState<RepertorioItem | null>(null)

  const repertorio = useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => a.ordine - b.ordine),
    [data],
  )
  const nextOrdine = repertorio.length > 0 ? Math.max(...repertorio.map((r) => r.ordine)) + 1 : 1
  const kind = container.servizioId != null ? "servizio" : "prova"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repertorio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Aggiungi i brani in programma. L'ordine può essere modificato in seguito dalla lista{" "}
          {kind === "servizio" ? "servizi" : "prove"}.
        </p>

        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi brano
          </Button>
        </div>

        <div className="rounded-md border">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento…
            </div>
          ) : isError ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Errore nel caricamento del repertorio.
            </p>
          ) : repertorio.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Nessun brano nel repertorio</p>
          ) : (
            <ul className="divide-y">
              {repertorio.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    {item.ordine}. {item.nome_parte?.nome ?? "—"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(item)}
                    aria-label="Rimuovi"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onSkip}>
            Salta questo step
          </Button>
          <Button type="button" onClick={onContinue}>
            Continua
          </Button>
        </div>
      </CardContent>

      <AddBranoRepertorioDialog
        container={container}
        nextOrdine={nextOrdine}
        open={addOpen}
        onOpenChange={setAddOpen}
        existingNomeParteIds={repertorio.map((r) => r.nome_parte_id)}
      />
      <DeleteRepertorioItemDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        item={deleting}
      />
    </Card>
  )
}
