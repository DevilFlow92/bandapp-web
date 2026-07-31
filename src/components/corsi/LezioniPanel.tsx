import { useLezioniByCorso } from "@/hooks/useLezioni"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface LezioniPanelProps {
  corsoId: number
  colSpan: number
}

function formatDataLezione(iso: string): string {
  const [datePart, timePart = ""] = iso.split("T")
  const [year, month, day] = datePart.split("-")
  if (!year || !month || !day) return iso
  const time = timePart.slice(0, 5)
  return time ? `${day}/${month}/${year} ${time}` : `${day}/${month}/${year}`
}

export default function LezioniPanel({ corsoId, colSpan }: LezioniPanelProps) {
  const { data, isLoading } = useLezioniByCorso(corsoId, 1, 100, !!corsoId)
  const lezioni = data?.items ?? []

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="px-4 py-3">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Calendario lezioni</h4>
          <div className="rounded-md border overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Indirizzo</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : lezioni.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-4 text-center text-muted-foreground">
                      Nessuna lezione
                    </TableCell>
                  </TableRow>
                ) : (
                  lezioni.map((lezione) => (
                    <TableRow key={lezione.id}>
                      <TableCell>{formatDataLezione(lezione.data_lezione)}</TableCell>
                      <TableCell>
                        {lezione.indirizzo ? (
                          <>
                            {lezione.indirizzo.prima_riga}
                            {lezione.indirizzo.numero_civico &&
                              ` ${lezione.indirizzo.numero_civico}`}
                            {lezione.indirizzo.cap && `, ${lezione.indirizzo.cap}`}
                            {lezione.indirizzo.comune && ` ${lezione.indirizzo.comune.descrizione}`}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{lezione.note ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
