import { useState } from "react"
import { ChevronRight, Loader2 } from "lucide-react"
import { usePercorsoFormativo } from "@/hooks/usePercorsoFormativo"
import { useIscrizioneCorso } from "@/hooks/useIscrizioniCorso"
import type { TappaPercorsoFormativo } from "@/types/percorso_formativo"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import IscrizioneCorsoFormDialog from "@/components/corsi/IscrizioneCorsoFormDialog"

interface PercorsoFormativoSectionProps {
  personaId: number
}

function riepilogoLabel(tappa: TappaPercorsoFormativo): string {
  const { totale, acquisita } = tappa.riepilogo_voci
  if (totale === 0) return "Nessuna voce di programma"
  return `${acquisita}/${totale} voci acquisite`
}

/**
 * Percorso formativo pluriennale di un allievo (card #209): timeline
 * verticale delle sue iscrizioni a corso nel tempo, sola lettura. Il
 * dettaglio di una tappa riusa `IscrizioneCorsoFormDialog` esistente (già
 * mostra voci, materiale, autovalutazioni, storico) invece di duplicarne il
 * contenuto — va quindi caricata l'iscrizione completa per id prima di
 * aprire il dialog, dato che la tappa espone solo un riepilogo.
 */
export default function PercorsoFormativoSection({ personaId }: PercorsoFormativoSectionProps) {
  const { data: tappe, isLoading, isError } = usePercorsoFormativo(personaId, personaId > 0)
  const [openIscrizioneId, setOpenIscrizioneId] = useState<number | null>(null)
  const iscrizioneQuery = useIscrizioneCorso(openIscrizioneId ?? 0, openIscrizioneId !== null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">Errore nel caricamento del percorso formativo.</p>
    )
  }

  if (!tappe || tappe.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna iscrizione a corsi registrata.</p>
  }

  return (
    <>
      <ol className="relative space-y-3 border-l pl-6">
        {tappe.map((tappa) => {
          const isLoadingThis =
            openIscrizioneId === tappa.iscrizione_corso_id && iscrizioneQuery.isLoading
          return (
            <li key={tappa.iscrizione_corso_id} className="relative">
              <span className="absolute -left-[1.6rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-70"
                onClick={() => setOpenIscrizioneId(tappa.iscrizione_corso_id)}
                disabled={isLoadingThis}
              >
                <div className="space-y-1.5">
                  <p className="font-medium">
                    {tappa.corso.anno} — {tappa.corso.tipo_corso.descrizione}
                  </p>
                  {tappa.scheda_alunno_id == null ? (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-gray-100 text-gray-700"
                    >
                      Scheda non ancora creata
                    </Badge>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                      <span>{riepilogoLabel(tappa)}</span>
                      {tappa.riepilogo_voci.in_corso > 0 && (
                        <Badge
                          variant="outline"
                          className="border-transparent bg-yellow-100 text-yellow-800"
                        >
                          {tappa.riepilogo_voci.in_corso} in corso
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                {isLoadingThis ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            </li>
          )
        })}
      </ol>

      <IscrizioneCorsoFormDialog
        open={openIscrizioneId !== null && !!iscrizioneQuery.data}
        onOpenChange={(open) => {
          if (!open) setOpenIscrizioneId(null)
        }}
        corsoId={iscrizioneQuery.data?.corso_id ?? 0}
        iscrizione={iscrizioneQuery.data ?? null}
      />
    </>
  )
}
