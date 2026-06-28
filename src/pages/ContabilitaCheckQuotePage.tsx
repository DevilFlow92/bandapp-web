import { useMemo, useState } from "react"
import { useBanda } from "@/context/BandaContext"
import { useCheckQuote } from "@/hooks/useCheckQuote"
import { getErrorMessage } from "@/lib/api"
import type { StatoQuota } from "@/types/check-quote"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ALL = "__all__"
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 2020 + 1 }, (_, i) => 2020 + i)
const COLUMNS = 6

function formatEuro(v: string): string {
  return `€ ${parseFloat(v).toFixed(2)}`
}

interface StatoBadgeConfig {
  label: string
  className: string
}

const STATO_CONFIG: Record<StatoQuota, StatoBadgeConfig> = {
  OK: {
    label: "OK",
    className: "border-transparent bg-green-100 text-green-800 shadow hover:bg-green-100/80",
  },
  PARZIALE: {
    label: "Parziale",
    className: "border-transparent bg-yellow-100 text-yellow-800 shadow hover:bg-yellow-100/80",
  },
  MANCANTE: {
    label: "Mancante",
    className: "border-transparent bg-red-100 text-red-800 shadow hover:bg-red-100/80",
  },
  SOVRAPPIU: {
    label: "Sovrappiù",
    className: "border-transparent bg-blue-100 text-blue-800 shadow hover:bg-blue-100/80",
  },
  NON_DOVUTA: {
    label: "Non dovuta",
    className: "border-transparent bg-gray-100 text-gray-800 shadow hover:bg-gray-100/80",
  },
}

export default function ContabilitaCheckQuotePage() {
  const { banda } = useBanda()
  const [anno, setAnno] = useState(CURRENT_YEAR)
  const [statoFilter, setStatoFilter] = useState<string>(ALL)

  const { data, isLoading, isError, error } = useCheckQuote(banda!.codice, anno, !!banda)

  const handleAnnoChange = (value: string) => {
    setAnno(Number(value))
  }

  const filteredSoci = useMemo(() => {
    const soci = data?.soci ?? []
    if (statoFilter === ALL) return soci
    return soci.filter((s) => s.stato === statoFilter)
  }, [data, statoFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Check Quote</h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="filtro-anno" className="text-sm text-muted-foreground">
            Anno
          </Label>
          <Select value={String(anno)} onValueChange={handleAnnoChange}>
            <SelectTrigger id="filtro-anno" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quota annuale attesa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatEuro(data.quota_annuale_attesa)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Totale atteso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatEuro(data.totali.totale_atteso)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Totale versato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatEuro(data.totali.totale_versato)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Totale mancante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums text-destructive">
                  {formatEuro(data.totali.totale_mancante)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["OK", data.totali.soci_ok],
                ["PARZIALE", data.totali.soci_parziale],
                ["MANCANTE", data.totali.soci_mancante],
                ["SOVRAPPIU", data.totali.soci_sovrappiu],
                ["NON_DOVUTA", data.totali.soci_non_dovuta],
              ] as [StatoQuota, number][]
            ).map(([stato, count]) => (
              <Badge key={stato} variant="outline" className={STATO_CONFIG[stato].className}>
                {STATO_CONFIG[stato].label} {count}
              </Badge>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <Label htmlFor="filtro-stato" className="text-sm text-muted-foreground">
          Stato
        </Label>
        <Select value={statoFilter} onValueChange={setStatoFilter}>
          <SelectTrigger id="filtro-stato" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti</SelectItem>
            {(Object.keys(STATO_CONFIG) as StatoQuota[]).map((stato) => (
              <SelectItem key={stato} value={stato}>
                {STATO_CONFIG[stato].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Nominativo</TableHead>
                <TableHead className="text-right">Quota attesa</TableHead>
                <TableHead className="text-right">Quota versata</TableHead>
                <TableHead className="text-right">Differenza</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: COLUMNS }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="py-12 text-center text-muted-foreground">
                    {getErrorMessage(error)}
                  </TableCell>
                </TableRow>
              ) : filteredSoci.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="py-12 text-center text-muted-foreground">
                    Nessun socio per l'anno selezionato.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSoci.map((socio) => {
                  const diff = parseFloat(socio.differenza)
                  const statoConf = STATO_CONFIG[socio.stato]
                  const nominativo =
                    `${socio.cognome ?? ""} ${socio.nome ?? ""}`.trim() || socio.codice_socio
                  return (
                    <TableRow key={socio.socio_id}>
                      <TableCell className="font-mono text-sm">{socio.codice_socio}</TableCell>
                      <TableCell>{nominativo}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatEuro(socio.quota_attesa)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatEuro(socio.quota_versata)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-medium ${
                          diff >= 0 ? "text-emerald-600" : "text-destructive"
                        }`}
                      >
                        {formatEuro(socio.differenza)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statoConf.className}>
                          {statoConf.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
