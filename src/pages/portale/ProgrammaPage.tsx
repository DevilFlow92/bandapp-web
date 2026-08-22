import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useMiaScheda } from "@/hooks/usePortaleAlunno"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProgrammaPage() {
  const navigate = useNavigate()
  const { iscrizioneCorsoId } = useParams()
  const id = Number(iscrizioneCorsoId)

  const { data: scheda, isLoading, isError, notFound } = useMiaScheda(id)

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
                <h3 className="mb-1 text-sm font-medium">Programma</h3>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {scheda?.programma ?? "—"}
                </p>
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
    </div>
  )
}
