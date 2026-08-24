import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useMiaScheda, useMioStoricoVoci } from "@/hooks/usePortaleAlunno"
import type { StatoVoceProgramma } from "@/types/scheda_alunno_voce"
import AutovalutazioniLog from "@/components/corsi/AutovalutazioniLog"
import StoricoVociLog from "@/components/corsi/StoricoVociLog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const STATO_LABELS: Record<StatoVoceProgramma, string> = {
  da_iniziare: "Da iniziare",
  in_corso: "In corso",
  acquisita: "Acquisita",
}

export default function ProgrammaPage() {
  const navigate = useNavigate()
  const { iscrizioneCorsoId } = useParams()
  const id = Number(iscrizioneCorsoId)

  const { data: scheda, isLoading, isError, notFound } = useMiaScheda(id)
  const voci = [...(scheda?.voci ?? [])].sort((a, b) => a.ordine - b.ordine)

  const [storicoPage, setStoricoPage] = useState(1)
  const storicoVociQuery = useMioStoricoVoci(id, storicoPage)

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2"
          onClick={() => navigate("/portale")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Le mie iscrizioni
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Programma</h1>
        <p className="text-sm text-muted-foreground">Programma e note condivisi dall'insegnante</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheda alunno</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : isError ? (
            <p className="py-4 text-center text-sm text-destructive">
              Errore nel caricamento del programma.
            </p>
          ) : notFound ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Il programma non è stato ancora condiviso dall'insegnante.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium">Programma</h3>
                {voci.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nessuna voce di programma inserita.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {voci.map((voce) => (
                      <li key={voce.id} className="rounded-md border px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{voce.voce_catalogo.testo}</span>
                          <Badge variant="secondary">{STATO_LABELS[voce.stato]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {voce.voce_catalogo.categoria.descrizione}
                        </p>
                        {voce.dettaglio && (
                          <p className="mt-1 text-sm text-foreground">{voce.dettaglio}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium">Note</h3>
                <p className="whitespace-pre-wrap text-sm text-foreground">{scheda?.note ?? "—"}</p>
              </div>
              {scheda?.aggiornato_da && (
                <p className="text-xs text-muted-foreground">
                  Ultimo aggiornamento di: {scheda.aggiornato_da.nome}{" "}
                  {scheda.aggiornato_da.cognome}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && !isError && !notFound && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Le mie note</CardTitle>
          </CardHeader>
          <CardContent>
            <AutovalutazioniLog
              iscrizioneCorsoId={id}
              autovalutazioni={scheda?.autovalutazioni ?? []}
              readOnly={false}
            />
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && !notFound && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cronologia programma</CardTitle>
          </CardHeader>
          <CardContent>
            <StoricoVociLog
              storico={storicoVociQuery.data?.items ?? []}
              meta={storicoVociQuery.data?.meta}
              isLoading={storicoVociQuery.isLoading}
              isError={storicoVociQuery.isError}
              page={storicoPage}
              onPageChange={setStoricoPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
