import { useMieIscrizioniCorso } from "@/hooks/usePortaleAlunno"
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

function formatDataIscrizione(iso: string): string {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function statoBadgeClass(descrizione?: string): string {
  if (!descrizione) return "bg-gray-100 text-gray-700"
  if (descrizione.includes("Confermata")) return "bg-green-100 text-green-800"
  if (descrizione.includes("Completata")) return "bg-blue-100 text-blue-800"
  if (descrizione.includes("Annullata")) return "bg-red-100 text-red-800"
  if (descrizione.includes("Richiesta")) return "bg-yellow-100 text-yellow-800"
  return "bg-gray-100 text-gray-700"
}

export default function MieIscrizioniPage() {
  const { data, isLoading, isError } = useMieIscrizioniCorso()
  const iscrizioni = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Le mie iscrizioni</h1>
        <p className="text-sm text-muted-foreground">Corsi a cui sei iscritto</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Iscrizioni ai corsi</CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Errore nel caricamento delle iscrizioni.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corso</TableHead>
                    <TableHead>Anno</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data iscrizione</TableHead>
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
                  ) : iscrizioni.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Nessuna iscrizione al momento
                      </TableCell>
                    </TableRow>
                  ) : (
                    iscrizioni.map((iscrizione) => (
                      <TableRow key={iscrizione.id}>
                        <TableCell>
                          {iscrizione.corso?.tipo_corso?.descrizione ??
                            `Corso #${iscrizione.corso?.id ?? iscrizione.corso_id}`}
                        </TableCell>
                        <TableCell>{iscrizione.corso?.anno ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            className={statoBadgeClass(
                              iscrizione.stato_iscrizione_corso?.descrizione,
                            )}
                          >
                            {iscrizione.stato_iscrizione_corso?.descrizione ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDataIscrizione(iscrizione.data_iscrizione)}</TableCell>
                      </TableRow>
                    ))
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
