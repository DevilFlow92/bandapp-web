import { useState } from "react"
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react"
import { useCatalogoProgrammi, useUpdateVoceCatalogo } from "@/hooks/useCatalogoProgrammi"
import { useLookupTipiCorso } from "@/hooks/useCorsi"
import { useConfirm } from "@/hooks/useConfirm"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import type { VoceProgrammaCatalogo } from "@/types/voce_programma_catalogo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import VoceCatalogoFormDialog from "@/components/corsi/VoceCatalogoFormDialog"

const PAGE_SIZE = 20
const COLUMNS = 6
const ALL_TIPI_CORSO = "__all__"
const STATO_TUTTE = "__tutte__"
const STATO_ATTIVE = "__attive__"
const STATO_DISATTIVATE = "__disattivate__"

const LIVELLO_LABELS: Record<number, string> = {
  1: "1 - Base",
  2: "2 - Intermedio",
  3: "3 - Avanzato",
}

export default function CatalogoProgrammaPage() {
  const confirm = useConfirm()
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [tipoCorsoFilter, setTipoCorsoFilter] = useState(ALL_TIPI_CORSO)
  const [statoFilter, setStatoFilter] = useState(STATO_ATTIVE)

  const tipiCorso = useLookupTipiCorso()
  const { data, isLoading, isError } = useCatalogoProgrammi(page, PAGE_SIZE, {
    tipoCorsoCodice: tipoCorsoFilter === ALL_TIPI_CORSO ? undefined : Number(tipoCorsoFilter),
    attiva: statoFilter === STATO_TUTTE ? undefined : statoFilter === STATO_ATTIVE ? true : false,
  })
  const updateVoce = useUpdateVoceCatalogo()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VoceProgrammaCatalogo | null>(null)

  const totalPages = data?.meta.total_pages ?? 1
  const voci = data?.items ?? []

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (voce: VoceProgrammaCatalogo) => {
    setEditing(voce)
    setFormOpen(true)
  }

  const handleToggleAttiva = async (voce: VoceProgrammaCatalogo) => {
    const ok = await confirm({
      title: voce.attiva ? "Disattiva voce" : "Riattiva voce",
      description: voce.attiva
        ? `Disattivare «${voce.testo}»? Non sarà più selezionabile per nuove voci di programma.`
        : `Riattivare «${voce.testo}»?`,
      confirmLabel: voce.attiva ? "Disattiva" : "Riattiva",
      variant: voce.attiva ? "destructive" : "default",
    })
    if (!ok) return
    try {
      await updateVoce.mutateAsync({ id: voce.id, input: { attiva: !voce.attiva } })
      toast({ title: voce.attiva ? "Voce disattivata" : "Voce riattivata" })
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Catalogo programmi</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuova voce
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="filtro-tipo-corso" className="text-sm text-muted-foreground">
            Tipo corso
          </Label>
          <Select
            value={tipoCorsoFilter}
            onValueChange={(v) => {
              setTipoCorsoFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger id="filtro-tipo-corso" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TIPI_CORSO}>Tutti i tipi corso</SelectItem>
              {(tipiCorso.data ?? []).map((t) => (
                <SelectItem key={t.codice} value={String(t.codice)}>
                  {t.descrizione}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="filtro-stato" className="text-sm text-muted-foreground">
            Stato
          </Label>
          <Select
            value={statoFilter}
            onValueChange={(v) => {
              setStatoFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger id="filtro-stato" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATO_ATTIVE}>Solo attive</SelectItem>
              <SelectItem value={STATO_DISATTIVATE}>Solo disattivate</SelectItem>
              <SelectItem value={STATO_TUTTE}>Tutte</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Testo</TableHead>
                <TableHead>Tipo corso</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Livello</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                    Errore nel caricamento del catalogo.
                  </TableCell>
                </TableRow>
              ) : voci.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="py-12 text-center text-muted-foreground">
                    Nessuna voce di catalogo trovata.
                  </TableCell>
                </TableRow>
              ) : (
                voci.map((voce) => (
                  <TableRow key={voce.id}>
                    <TableCell className="font-medium">{voce.testo}</TableCell>
                    <TableCell>{voce.tipo_corso.descrizione}</TableCell>
                    <TableCell>{voce.categoria.descrizione}</TableCell>
                    <TableCell>{LIVELLO_LABELS[voce.livello] ?? voce.livello}</TableCell>
                    <TableCell>
                      <Badge variant={voce.attiva ? "success" : "secondary"}>
                        {voce.attiva ? "Attiva" : "Disattivata"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(voce)}
                          aria-label="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAttiva(voce)}
                          disabled={updateVoce.isPending}
                        >
                          {voce.attiva ? "Disattiva" : "Riattiva"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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

      <VoceCatalogoFormDialog open={formOpen} onOpenChange={setFormOpen} voce={editing} />
    </div>
  )
}
