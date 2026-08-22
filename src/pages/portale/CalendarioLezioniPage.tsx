import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useMieLezioni, useMiePresenze } from "@/hooks/usePortaleAlunno"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Presenza } from "@/types/presenza"

function formatDataLezione(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function statoPresenzaLabel(stato?: Presenza["stato"]): string {
  if (stato === "PRESENTE") return "Presente"
  if (stato === "ASSENTE") return "Assente"
  if (stato === "GIUSTIFICATO") return "Giustificato"
  return "Non ancora registrata"
}

function statoPresenzaBadgeClass(stato?: Presenza["stato"]): string {
  if (stato === "PRESENTE") return "bg-green-100 text-green-800"
  if (stato === "ASSENTE") return "bg-red-100 text-red-800"
  if (stato === "GIUSTIFICATO") return "bg-yellow-100 text-yellow-800"
  return "bg-gray-100 text-gray-700"
}

export default function CalendarioLezioniPage() {
  const navigate = useNavigate()
  const { iscrizioneCorsoId } = useParams()
  const id = Number(iscrizioneCorsoId)

  const { data: lezioniData, isLoading: lezioniLoading, isError: lezioniError } = useMieLezioni(id)
  const {
    data: presenzeData,
    isLoading: presenzeLoading,
    isError: presenzeError,
  } = useMiePresenze(id)

  const lezioni = [...(lezioniData?.items ?? [])].sort((a, b) =>
    a.data_lezione.localeCompare(b.data_lezione),
  )
  const presenzePerLezione = new Map(
    (presenzeData?.items ?? [])
      .filter((presenza) => presenza.lezione_id != null)
      .map((presenza) => [presenza.lezione_id as number, presenza]),
  )

  const isLoading = lezioniLoading || presenzeLoading
  const isError = lezioniError || presenzeError

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
        <h1 className="text-2xl font-semibold tracking-tight">Calendario lezioni</h1>
        <p className="text-sm text-muted-foreground">Lezioni programmate e stato di presenza</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lezioni</CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Errore nel caricamento del calendario.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data lezione</TableHead>
                    <TableHead>Stato presenza</TableHead>
                    <TableHead>Note lezione</TableHead>
                    <TableHead>Note presenza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : lezioni.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Nessuna lezione programmata
                      </TableCell>
                    </TableRow>
                  ) : (
                    lezioni.map((lezione) => {
                      const presenza = presenzePerLezione.get(lezione.id)
                      return (
                        <TableRow key={lezione.id}>
                          <TableCell>{formatDataLezione(lezione.data_lezione)}</TableCell>
                          <TableCell>
                            <Badge className={statoPresenzaBadgeClass(presenza?.stato)}>
                              {statoPresenzaLabel(presenza?.stato)}
                            </Badge>
                          </TableCell>
                          <TableCell>{lezione.note ?? "—"}</TableCell>
                          <TableCell>{presenza?.note ?? "—"}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
