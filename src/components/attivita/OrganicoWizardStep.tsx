import { useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { useOrganico, type OrganicoContainer } from "@/hooks/usePresenze"
import type { Presenza } from "@/types/presenza"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AddPersonaOrganicoDialog from "@/components/attivita/AddPersonaOrganicoDialog"
import DeletePresenzaDialog from "@/components/attivita/DeletePresenzaDialog"

function personaInPresenzaLabel(presenza: Presenza): string {
  const { nome, cognome, ragione_sociale } = presenza.persona ?? {}
  return ragione_sociale || `${nome ?? ""} ${cognome ?? ""}`.trim() || "—"
}

interface OrganicoWizardStepProps {
  container: OrganicoContainer
  onSkip: () => void
  onContinue: () => void
}

/**
 * Organico step of the Servizio/Prova creation wizards: a plain list with
 * add/remove, as opposed to OrganicoPanel which renders the same data as an
 * expandable <TableRow> inside the Servizi/Prove tables and so can't be used
 * standalone here. Reads its own copy of the organico query — the queryKey is
 * container-scoped, so a parent showing a count off the same hook doesn't
 * trigger a second request.
 */
export default function OrganicoWizardStep({
  container,
  onSkip,
  onContinue,
}: OrganicoWizardStepProps) {
  const { data, isLoading, isError } = useOrganico(container)
  const [addTipo, setAddTipo] = useState<"socio" | "esterno" | null>(null)
  const [deleting, setDeleting] = useState<Presenza | null>(null)

  const organico = useMemo(() => data?.items ?? [], [data])
  const kind = container.servizioId != null ? "servizio" : "prova"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {kind === "servizio"
            ? "Aggiungi i soci e gli esterni che partecipano al servizio. Le presenze si registrano in seguito dalla lista servizi."
            : "Aggiungi i soci e gli esterni che partecipano alla prova. Le presenze si registrano in seguito dalla lista prove."}
        </p>

        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setAddTipo("socio")}>
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi socio
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setAddTipo("esterno")}>
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi esterno
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
              Errore nel caricamento dell'organico.
            </p>
          ) : organico.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Nessuna persona in organico</p>
          ) : (
            <ul className="divide-y">
              {organico.map((presenza) => (
                <li
                  key={presenza.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>{personaInPresenzaLabel(presenza)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(presenza)}
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

      <AddPersonaOrganicoDialog
        container={container}
        tipo={addTipo ?? "socio"}
        open={addTipo !== null}
        onOpenChange={(open) => {
          if (!open) setAddTipo(null)
        }}
        existingPersonaIds={organico.map((p) => p.persona_id)}
      />
      <DeletePresenzaDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        presenza={deleting}
      />
    </Card>
  )
}
