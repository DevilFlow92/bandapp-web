import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
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
import type { SezioneRendicontoAggregato, VoceRendicontoAggregato } from "@/types/rendiconto"
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

function formatEuroNum(v: number): string {
  return `€ ${v.toFixed(2)}`
}

function formatEuro(value: string | number | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0)
  return isNaN(n) ? formatEuroNum(0) : formatEuroNum(n)
}

function findVocePrev(
  sezionePrev: SezioneRendicontoAggregato | undefined,
  voceCodice: number,
): VoceRendicontoAggregato | undefined {
  return sezionePrev?.voci.find((v) => v.codice === voceCodice)
}

function findSottovoce(vocePrev: VoceRendicontoAggregato | undefined, sottovoceCodice: number) {
  return vocePrev?.sottovoci.find((sv) => sv.codice === sottovoceCodice)
}

function StatCard({
  label,
  value,
  prevValue,
  prevYear,
  valueClassName,
}: {
  label: string
  value: string
  prevValue: string
  prevYear: number
  valueClassName?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold tabular-nums ${valueClassName ?? ""}`}>{value}</p>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {prevYear}: {prevValue}
        </p>
      </CardContent>
    </Card>
  )
}

function SezionePanel({
  label,
  anno,
  sezione,
  sezionePrev,
}: {
  label: string
  anno: number
  sezione?: SezioneRendicontoAggregato
  sezionePrev?: SezioneRendicontoAggregato
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrizione</TableHead>
          <TableHead className="text-right">{anno}</TableHead>
          <TableHead className="text-right">{anno - 1}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(sezione?.voci ?? []).flatMap((voce) => {
          const vocePrev = findVocePrev(sezionePrev, voce.codice)
          return [
            <TableRow key={`voce-${voce.codice}`} className="bg-muted/30">
              <TableCell className="font-semibold">{voce.descrizione}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatEuro(voce.totale)}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-muted-foreground">
                {formatEuro(vocePrev?.totale ?? "0")}
              </TableCell>
            </TableRow>,
            ...voce.sottovoci.map((sv) => (
              <TableRow key={`sv-${voce.codice}-${sv.codice}`}>
                <TableCell className="pl-6 text-sm text-muted-foreground">
                  {sv.descrizione}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {formatEuro(sv.totale)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {formatEuro(findSottovoce(vocePrev, sv.codice)?.totale ?? "0")}
                </TableCell>
              </TableRow>
            )),
          ]
        })}
        <TableRow className="border-t-2">
          <TableCell className="font-bold">Totale {label}</TableCell>
          <TableCell className="text-right font-bold tabular-nums">
            {formatEuro(sezione?.totale ?? "0")}
          </TableCell>
          <TableCell className="text-right font-bold tabular-nums text-muted-foreground">
            {formatEuro(sezionePrev?.totale ?? "0")}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function FuoriBilancioPanel({ sezione }: { sezione: SezioneRendicontoAggregato }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrizione</TableHead>
          <TableHead className="text-right">Totale</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sezione.voci.flatMap((voce) => [
          <TableRow key={`fb-voce-${voce.codice}`} className="bg-muted/30">
            <TableCell className="font-semibold">{voce.descrizione}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {formatEuro(voce.totale)}
            </TableCell>
          </TableRow>,
          ...voce.sottovoci.map((sv) => (
            <TableRow key={`fb-sv-${voce.codice}-${sv.codice}`}>
              <TableCell className="pl-6 text-sm text-muted-foreground">{sv.descrizione}</TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {formatEuro(sv.totale)}
              </TableCell>
            </TableRow>
          )),
        ])}
        <TableRow className="border-t-2">
          <TableCell className="font-bold">Totale Fuori Bilancio</TableCell>
          <TableCell className="text-right font-bold tabular-nums">
            {formatEuro(sezione.totale)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function FigurativiPanel({ label, anno }: { label: string; anno: number }) {
  const zero = formatEuroNum(0)
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrizione</TableHead>
            <TableHead className="text-right">{anno}</TableHead>
            <TableHead className="text-right">{anno - 1}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>1) Da attività di interesse generale</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{zero}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>2) Da attività diverse</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{zero}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
          </TableRow>
          <TableRow className="border-t-2">
            <TableCell className="font-bold">Totale</TableCell>
            <TableCell className="text-right font-bold tabular-nums text-muted-foreground">
              {zero}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-muted-foreground">
              —
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

export default function ContabilitaRendicontoPage() {
  const { banda } = useBanda()
  const { toast } = useToast()
  const [anno, setAnno] = useState(CURRENT_YEAR)
  const [annoMensile, setAnnoMensile] = useState<number>(CURRENT_YEAR)
  const [isExporting, setIsExporting] = useState(false)
  const [showFuori, setShowFuori] = useState(false)

  useEffect(() => {
    setAnnoMensile(anno)
  }, [anno])

  const enabled = !!banda
  const bandaCodice = banda!.codice
  const annoPrec = anno - 1

  const { data, isLoading, isError } = useRendiconto(bandaCodice, anno, enabled)
  const { data: dataPrev } = useRendiconto(bandaCodice, annoPrec, enabled)
  const { data: mensileData } = useRendicontoMensile(bandaCodice, anno, enabled)
  const { data: mensileDataPrev } = useRendicontoMensile(bandaCodice, anno - 1, enabled)

  const activeMensileData = annoMensile === anno ? mensileData : mensileDataPrev

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
  const saldoInizialeCassa = parseFloat(data?.saldo_iniziale_cassa ?? "0")
  const saldoInizialeBanca = parseFloat(data?.saldo_iniziale_banca ?? "0")

  const totaliPrev = dataPrev?.totali
  const entratePrev = parseFloat(totaliPrev?.entrate ?? "0")
  const uscitePrev = parseFloat(totaliPrev?.uscite ?? "0")
  const avanzoPrev = parseFloat(totaliPrev?.avanzo_disavanzo ?? "0")
  const saldoFinaleCassaPrev = parseFloat(totaliPrev?.saldo_finale_cassa ?? "0")
  const saldoFinaleBancaPrev = parseFloat(totaliPrev?.saldo_finale_banca ?? "0")
  const liquiditaTotalePrev = saldoFinaleCassaPrev + saldoFinaleBancaPrev
  const saldoInizialeCassaPrev = parseFloat(dataPrev?.saldo_iniziale_cassa ?? "0")
  const saldoInizialeBancaPrev = parseFloat(dataPrev?.saldo_iniziale_banca ?? "0")

  const saldoInizialeTotal = saldoInizialeCassa + saldoInizialeBanca
  const saldoFinaleTotal = saldoFinaleCassa + saldoFinaleBanca
  const quadraturaDiff = Math.abs(saldoInizialeTotal + avanzo - saldoFinaleTotal)
  const quadraturaOk = quadraturaDiff < 0.01

  const sezioneUscite = data?.sezioni.find((s) => s.descrizione.toLowerCase() === "uscite")
  const sezioneEntrate = data?.sezioni.find((s) => s.descrizione.toLowerCase() === "entrate")
  const sezioneFuori = data?.sezioni.find((s) => s.descrizione.toLowerCase().includes("fuori"))

  const sezioneUscitePrev = dataPrev?.sezioni.find((s) => s.descrizione.toLowerCase() === "uscite")
  const sezioneEntratePrev = dataPrev?.sezioni.find(
    (s) => s.descrizione.toLowerCase() === "entrate",
  )

  const pieData =
    sezioneEntrate?.voci
      .map((v) => ({ name: v.descrizione, value: parseFloat(v.totale) }))
      .filter((d) => d.value > 0) ?? []

  const pieDataUscite =
    sezioneUscite?.voci
      .map((v) => ({ name: v.descrizione, value: Math.abs(parseFloat(v.totale)) }))
      .filter((d) => d.value > 0) ?? []

  const mensileChartData =
    activeMensileData?.mensile.map((item) => ({
      mese: MESI[item.mese - 1],
      Entrate: parseFloat(item.entrate),
      Uscite: parseFloat(item.uscite),
    })) ?? []

  const showFuoriSection = !!sezioneFuori && parseFloat(sezioneFuori.totale) !== 0

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
            <StatCard
              label="Saldo iniziale cassa"
              value={formatEuroNum(saldoInizialeCassa)}
              prevValue={formatEuroNum(saldoInizialeCassaPrev)}
              prevYear={annoPrec}
            />
            <StatCard
              label="Saldo iniziale banca"
              value={formatEuroNum(saldoInizialeBanca)}
              prevValue={formatEuroNum(saldoInizialeBancaPrev)}
              prevYear={annoPrec}
            />
            <StatCard
              label="Entrate totali"
              value={formatEuroNum(entrate)}
              prevValue={formatEuroNum(entratePrev)}
              prevYear={annoPrec}
            />
            <StatCard
              label="Uscite totali"
              value={formatEuroNum(uscite)}
              prevValue={formatEuroNum(uscitePrev)}
              prevYear={annoPrec}
            />
            <StatCard
              label="Avanzo / Disavanzo"
              value={formatEuroNum(avanzo)}
              prevValue={formatEuroNum(avanzoPrev)}
              prevYear={annoPrec}
              valueClassName={avanzo >= 0 ? "text-emerald-600" : "text-destructive"}
            />
            <StatCard
              label="Saldo finale cassa"
              value={formatEuroNum(saldoFinaleCassa)}
              prevValue={formatEuroNum(saldoFinaleCassaPrev)}
              prevYear={annoPrec}
            />
            <StatCard
              label="Saldo finale banca"
              value={formatEuroNum(saldoFinaleBanca)}
              prevValue={formatEuroNum(saldoFinaleBancaPrev)}
              prevYear={annoPrec}
            />
            <StatCard
              label="Liquidità totale"
              value={formatEuroNum(liquiditaTotale)}
              prevValue={formatEuroNum(liquiditaTotalePrev)}
              prevYear={annoPrec}
            />
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
                <CardTitle className="text-base">Uscite per voce (A–E)</CardTitle>
              </CardHeader>
              <CardContent>
                {pieDataUscite.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nessuna uscita registrata per l'anno {anno}.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieDataUscite}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {pieDataUscite.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Andamento mensile</CardTitle>
                <Select
                  value={String(annoMensile)}
                  onValueChange={(v) => setAnnoMensile(Number(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(anno)}>{anno}</SelectItem>
                    <SelectItem value={String(anno - 1)}>{anno - 1}</SelectItem>
                  </SelectContent>
                </Select>
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
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Uscite
                  </h3>
                  <SezionePanel
                    label="Uscite"
                    anno={anno}
                    sezione={sezioneUscite}
                    sezionePrev={sezioneUscitePrev}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Entrate
                  </h3>
                  <SezionePanel
                    label="Entrate"
                    anno={anno}
                    sezione={sezioneEntrate}
                    sezionePrev={sezioneEntratePrev}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t-2 pt-3">
                <span className="font-bold">
                  {avanzo >= 0 ? "Avanzo di gestione" : "Disavanzo di gestione"}
                </span>
                <div className="flex items-center gap-6">
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      avanzo >= 0 ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    {formatEuro(data?.totali.avanzo_disavanzo ?? "0")}
                  </span>
                  <span
                    className={`text-sm tabular-nums ${
                      avanzoPrev >= 0 ? "text-emerald-600/70" : "text-destructive/70"
                    }`}
                  >
                    {annoPrec}: {formatEuro(dataPrev?.totali.avanzo_disavanzo ?? "0")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cassa e banca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Cassa e banca
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrizione</TableHead>
                        <TableHead className="text-right">{anno}</TableHead>
                        <TableHead className="text-right">{annoPrec}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Cassa</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEuroNum(saldoFinaleCassa)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {dataPrev ? formatEuroNum(saldoFinaleCassaPrev) : "—"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Depositi bancari e postali</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEuroNum(saldoFinaleBanca)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {dataPrev ? formatEuroNum(saldoFinaleBancaPrev) : "—"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div aria-hidden />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Costi e proventi figurativi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <FigurativiPanel label="Costi figurativi" anno={anno} />
                <FigurativiPanel label="Proventi figurativi" anno={anno} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Redatto in conformità al modello D del D.M. n. 39/2020
              </p>
            </CardContent>
          </Card>

          {showFuoriSection && (
            <Card>
              <CardHeader>
                <button
                  type="button"
                  onClick={() => setShowFuori((prev) => !prev)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <CardTitle className="text-base">Fuori Bilancio</CardTitle>
                  {showFuori ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CardHeader>
              {showFuori && (
                <CardContent>
                  <FuoriBilancioPanel sezione={sezioneFuori!} />
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
