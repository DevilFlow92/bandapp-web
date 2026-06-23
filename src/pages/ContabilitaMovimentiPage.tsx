import { useMemo, useState } from "react"
import { ArrowLeftRight, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useBanda } from "@/context/BandaContext"
import { useFlussiCassa } from "@/hooks/useFlussiCassa"
import { useConfigurazioniBandaAnno } from "@/hooks/useConfigurazioneAnno"
import type { FlussoCassa, TipoFlusso } from "@/types/flusso-cassa"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import FlussoCassaFormDialog from "@/components/contabilita/FlussoCassaFormDialog"
import TrasferimentoFormDialog from "@/components/contabilita/TrasferimentoFormDialog"
import DeleteFlussoCassaDialog from "@/components/contabilita/DeleteFlussoCassaDialog"

const PAGE_SIZE = 20
const COLUMNS = 7
const ALL = "__all__"
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 2020 + 1 }, (_, i) => 2020 + i)

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function formatImporto(importo: string): string {
  return `€ ${parseFloat(importo).toFixed(2)}`
}

interface TipoBadgeConfig {
  label: string
  className: string
}

const TIPO_CONFIG: Record<TipoFlusso, TipoBadgeConfig> = {
  MOVIMENTO: { label: "Movimento", className: "" },
  SALDO_INIZIALE: {
    label: "Saldo iniziale",
    className: "border-transparent bg-blue-100 text-blue-800 shadow hover:bg-blue-100/80",
  },
  TRASFERIMENTO_USCITA: {
    label: "Trasf. uscita",
    className: "border-transparent bg-orange-100 text-orange-800 shadow hover:bg-orange-100/80",
  },
  TRASFERIMENTO_ENTRATA: {
    label: "Trasf. entrata",
    className: "border-transparent bg-orange-100 text-orange-800 shadow hover:bg-orange-100/80",
  },
  AUTO_ISCRIZIONE: {
    label: "Auto iscrizione",
    className: "border-transparent bg-purple-100 text-purple-800 shadow hover:bg-purple-100/80",
  },
}

type TipoFilter = typeof ALL | "MOVIMENTO" | "TRASFERIMENTO" | "AUTO_ISCRIZIONE" | "SALDO_INIZIALE"

function matchesTipoFilter(flusso: FlussoCassa, filter: TipoFilter): boolean {
  if (filter === ALL) return true
  if (filter === "TRASFERIMENTO")
    return flusso.tipo === "TRASFERIMENTO_USCITA" || flusso.tipo === "TRASFERIMENTO_ENTRATA"
  return flusso.tipo === filter
}

export default function ContabilitaMovimentiPage() {
  const { banda } = useBanda()
  const [anno, setAnno] = useState(CURRENT_YEAR)
  const [page, setPage] = useState(1)
  const [naturaFilter, setNaturaFilter] = useState<string>(ALL)
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>(ALL)

  const [formOpen, setFormOpen] = useState(false)
  const [trasferimentoOpen, setTrasferimentoOpen] = useState(false)
  const [editing, setEditing] = useState<FlussoCassa | null>(null)
  const [deleting, setDeleting] = useState<FlussoCassa | null>(null)

  const { data, isLoading, isError } = useFlussiCassa(banda!.codice, anno, page, PAGE_SIZE, !!banda)

  const { data: configurazioni } = useConfigurazioniBandaAnno(banda!.codice, 1, 50, !!banda)
  const configAnno = configurazioni?.items.find((c) => c.anno === anno) ?? null
  const annoClosed = configAnno?.chiuso === true

  const totalPages = data?.meta.total_pages ?? 1

  const filteredItems = useMemo(() => {
    const items = data?.items ?? []
    return items.filter((f) => {
      if (naturaFilter !== ALL && String(f.natura_flusso_codice) !== naturaFilter) return false
      if (!matchesTipoFilter(f, tipoFilter)) return false
      return true
    })
  }, [data, naturaFilter, tipoFilter])

  const handleAnnoChange = (value: string) => {
    setAnno(Number(value))
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (flusso: FlussoCassa) => {
    setEditing(flusso)
    setFormOpen(true)
  }

  const canEdit = (flusso: FlussoCassa) =>
    !annoClosed && flusso.tipo !== "AUTO_ISCRIZIONE" && !flusso.trasferimento_id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Movimenti di cassa</h1>
        <div className="flex gap-2">
          <Button onClick={openCreate} disabled={annoClosed}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo movimento
          </Button>
          <Button
            variant="outline"
            onClick={() => setTrasferimentoOpen(true)}
            disabled={annoClosed}
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Nuovo trasferimento
          </Button>
        </div>
      </div>

      {annoClosed && (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Anno {anno} chiuso — i movimenti sono in sola lettura.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
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

        <div className="flex items-center gap-2">
          <Label htmlFor="filtro-natura" className="text-sm text-muted-foreground">
            Natura
          </Label>
          <Select value={naturaFilter} onValueChange={setNaturaFilter}>
            <SelectTrigger id="filtro-natura" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti</SelectItem>
              <SelectItem value="1">Cassa</SelectItem>
              <SelectItem value="2">Banca</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="filtro-tipo" className="text-sm text-muted-foreground">
            Tipo
          </Label>
          <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as TipoFilter)}>
            <SelectTrigger id="filtro-tipo" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti</SelectItem>
              <SelectItem value="MOVIMENTO">Movimento</SelectItem>
              <SelectItem value="TRASFERIMENTO">Trasferimento</SelectItem>
              <SelectItem value="AUTO_ISCRIZIONE">Auto iscrizione</SelectItem>
              <SelectItem value="SALDO_INIZIALE">Saldo iniziale</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead>Voce</TableHead>
              <TableHead>Natura</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Importo</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
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
                  Errore nel caricamento dei movimenti.
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS} className="py-12 text-center text-muted-foreground">
                  Nessun movimento registrato per l'anno {anno}.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((flusso) => {
                const tipoConf = TIPO_CONFIG[flusso.tipo]
                return (
                  <TableRow key={flusso.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(flusso.data_registrazione)}
                    </TableCell>
                    <TableCell>{flusso.descrizione_operazione}</TableCell>
                    <TableCell>{flusso.voce_contabilita?.voce_contabilita ?? "—"}</TableCell>
                    <TableCell>{flusso.natura_flusso?.descrizione ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={tipoConf.className ? "outline" : "secondary"}
                        className={tipoConf.className || undefined}
                      >
                        {tipoConf.label}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        flusso.segno === "+" ? "text-emerald-600" : "text-destructive"
                      }`}
                    >
                      {flusso.segno === "+" ? "+" : "-"}
                      {formatImporto(flusso.importo)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(flusso)}
                          disabled={!canEdit(flusso)}
                          aria-label="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(flusso)}
                          disabled={annoClosed}
                          aria-label="Elimina"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pagina {data?.meta.page ?? page} di {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Precedente
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            Successiva
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <FlussoCassaFormDialog open={formOpen} onOpenChange={setFormOpen} flusso={editing} />
      <TrasferimentoFormDialog open={trasferimentoOpen} onOpenChange={setTrasferimentoOpen} />
      <DeleteFlussoCassaDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        flusso={deleting}
      />
    </div>
  )
}
