import { useState } from "react"
import {
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useBanda } from "@/context/BandaContext"
import {
  useRendiconto,
  useRendicontoMensile,
  downloadRendicontoPdf,
  downloadRendicontoXlsx,
} from "@/hooks/useRendiconto"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 2020 + 1 }, (_, i) => 2020 + i)

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]

const PIE_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#9333ea", "#0891b2"]

function formatEuro(v: string): string {
  return `€ ${parseFloat(v).toFixed(2)}`
}

function formatEuroNum(v: number): string {
  return `€ ${v.toFixed(2)}`
}

export default function ContabilitaRendicontoPage() {
  const { banda } = useBanda()
  const { toast } = useToast()
  const [anno, setAnno] = useState(CURRENT_YEAR)
  const [isExporting, setIsExporting] = useState(false)

  const enabled = !!banda
  const bandaCodice = banda!.codice

  const { data, isLoading, isError } = useRendiconto(bandaCodice, anno, enabled)
  const { data: mensileData } = useRendicontoMensile(bandaCodice, anno, enabled)

  const handleAnnoChange = (value: string) => {
    setAnno(Number(value))
  }

  const handleExportPdf = async () => {
    setIsExporting(true)
    try {
      await downloadRendicontoPdf(bandaCodice, anno)
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(error) })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportXlsx = async () => {
    setIsExporting(true)
    try {
      await downloadRendicontoXlsx(bandaCodice, anno)
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(error) })
    } finally {
      setIsExporting(false)
    }
  }

  const totali = data?.totali
  const entrate = parseFloat(totali?.entrate ?? "0")
  const uscite = parseFloat(totali?.uscite ?? "0")
  const avanzo = parseFloat(totali?.avanzo_disavanzo ?? "0")
  const saldoFinaleCassa = parseFloat(totali?.saldo_finale_cassa ?? "0")
  const saldoFinaleBanca = parseFloat(totali?.saldo_finale_banca ?? "0")
  const liquiditaTotale = saldoFinaleCassa + saldoFinaleBanca

  const saldoInizialeTotal =
    parseFloat(data?.saldo_iniziale_cassa ?? "0") + parseFloat(data?.saldo_iniziale_banca ?? "0")
  const saldoFinaleTotal = saldoFinaleCassa + saldoFinaleBanca
  const quadraturaDiff = Math.abs(saldoInizialeTotal + avanzo - saldoFinaleTotal)
  const quadraturaOk = quadraturaDiff < 0.01

  const sezioneEntrate = data?.sezioni.find((s) => s.descrizione.toLowerCase() === "entrate")
  const pieData =
    sezioneEntrate?.voci
      .map((v) => ({ name: v.descrizione, value: parseFloat(v.totale) }))
      .filter((d) => d.value > 0) ?? []

  const mensileChartData =
    mensileData?.mensile.map((item) => ({
      mese: MESI[item.mese - 1],
      Entrate: parseFloat(item.entrate),
      Uscite: parseFloat(item.uscite),
    })) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Rendiconto</h1>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" onClick={handleExportPdf} disabled={isExporting || !data}>
            Esporta PDF
          </Button>
          <Button variant="outline" onClick={handleExportXlsx} disabled={isExporting || !data}>
            Esporta Excel
          </Button>
          {data?.chiuso && <Badge>Anno chiuso</Badge>}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Errore nel caricamento del rendiconto.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Entrate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{formatEuroNum(entrate)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Uscite</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{formatEuroNum(uscite)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avanzo / Disavanzo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    avanzo >= 0 ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {formatEuroNum(avanzo)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo finale cassa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{formatEuroNum(saldoFinaleCassa)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo finale banca
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{formatEuroNum(saldoFinaleBanca)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Liquidità totale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{formatEuroNum(liquiditaTotale)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Quadratura:</span>
            <Badge variant={quadraturaOk ? "default" : "destructive"}>
              {quadraturaOk ? "Quadratura OK" : "Quadratura KO"}
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entrate per voce (A–E)</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nessuna entrata registrata per l'anno {anno}.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatEuroNum(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Andamento mensile</CardTitle>
              </CardHeader>
              <CardContent>
                {mensileChartData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nessun dato mensile per l'anno {anno}.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mensileChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mese" />
                      <YAxis tickFormatter={(v: number) => `€${v}`} />
                      <Tooltip formatter={(value) => formatEuroNum(Number(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Entrate"
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Uscite"
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modello D — Aggregato per sezione</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrizione</TableHead>
                    <TableHead className="text-right">Totale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.sezioni ?? []).flatMap((sezione) => [
                    <TableRow key={`sezione-${sezione.codice}`} className="bg-muted/40">
                      <TableCell className="font-bold">{sezione.descrizione}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatEuro(sezione.totale)}
                      </TableCell>
                    </TableRow>,
                    ...sezione.voci.flatMap((voce) => [
                      <TableRow key={`voce-${sezione.codice}-${voce.codice}`}>
                        <TableCell className="font-semibold">{voce.descrizione}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatEuro(voce.totale)}
                        </TableCell>
                      </TableRow>,
                      ...voce.sottovoci.map((sv) => (
                        <TableRow key={`sv-${sezione.codice}-${voce.codice}-${sv.codice}`}>
                          <TableCell className="pl-8 text-muted-foreground">
                            {sv.descrizione}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {formatEuro(sv.totale)}
                          </TableCell>
                        </TableRow>
                      )),
                    ]),
                  ])}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
