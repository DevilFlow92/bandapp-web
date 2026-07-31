import { useIscrizioniCorsoByCorso } from "@/hooks/useIscrizioniCorso"
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

interface IscrizioniPanelProps {
  corsoId: number
  colSpan: number
}

function formatDataIscrizione(iso: string): string {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function personaLabel(persona?: { nome?: string | null; cognome?: string | null }): string {
  const nome = persona?.nome ?? ""
  const cognome = persona?.cognome ?? ""
  return `${nome} ${cognome}`.trim() || "—"
}

function statoBadgeClass(stato?: { descrizione?: string }): string {
  const descrizione = stato?.descrizione ?? ""
  if (descrizione.includes("Attivo") || descrizione.includes("attivo"))
    return "bg-green-100 text-green-800"
  if (descrizione.includes("Ritirati") || descrizione.includes("ritirati"))
    return "bg-red-100 text-red-800"
  if (descrizione.includes("Sospeso") || descrizione.includes("sospeso"))
    return "bg-yellow-100 text-yellow-800"
  return "bg-gray-100 text-gray-700"
}

export default function IscrizioniPanel({ corsoId, colSpan }: IscrizioniPanelProps) {
  const { data, isLoading } = useIscrizioniCorsoByCorso(corsoId, 1, 100, !!corsoId)
  const iscrizioni = data?.items ?? []

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="px-4 py-3">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Elenco iscritti</h4>
          <div className="rounded-md border overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Alunno</TableHead>
                  <TableHead>Stato iscrizione</TableHead>
                  <TableHead>Data iscrizione</TableHead>
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
                      <TableCell>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : iscrizioni.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                      Nessun iscritto
                    </TableCell>
                  </TableRow>
                ) : (
                  iscrizioni.map((iscrizione) => (
                    <TableRow key={iscrizione.id}>
                      <TableCell>{personaLabel(iscrizione.persona)}</TableCell>
                      <TableCell>
                        <Badge className={statoBadgeClass(iscrizione.stato_iscrizione_corso)}>
                          {iscrizione.stato_iscrizione_corso?.descrizione ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDataIscrizione(iscrizione.data_iscrizione)}</TableCell>
                      <TableCell>{iscrizione.note ?? "—"}</TableCell>
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
