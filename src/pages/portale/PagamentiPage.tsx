import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Receipt } from "lucide-react"
import { useMieiPagamenti } from "@/hooks/usePortaleAlunno"
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

function formatDataPagamento(iso: string): string {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

export default function PagamentiPage() {
  const navigate = useNavigate()
  const { iscrizioneCorsoId } = useParams()
  const id = Number(iscrizioneCorsoId)

  const { data, isLoading, isError } = useMieiPagamenti(id)
  const pagamenti = data?.items ?? []

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
        <h1 className="text-2xl font-semibold tracking-tight">Pagamenti</h1>
        <p className="text-sm text-muted-foreground">Pagamenti registrati per questo corso</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Elenco pagamenti</CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="py-4 text-center text-sm text-destructive">
              Errore nel caricamento dei pagamenti.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data pagamento</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Ricevuta</TableHead>
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
                  ) : pagamenti.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Nessun pagamento registrato al momento
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagamenti.map((pagamento) => (
                      <TableRow key={pagamento.id}>
                        <TableCell>{formatDataPagamento(pagamento.data_pagamento)}</TableCell>
                        <TableCell>€ {pagamento.importo.toFixed(2)}</TableCell>
                        <TableCell>{pagamento.note ?? "—"}</TableCell>
                        <TableCell>
                          {pagamento.ricevuta ? (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-green-100 text-green-800"
                              title={`Ricevuta #${pagamento.ricevuta.id} generata automaticamente`}
                            >
                              <Receipt className="mr-1 h-3 w-3" />
                              Ricevuta #{pagamento.ricevuta.id}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
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
