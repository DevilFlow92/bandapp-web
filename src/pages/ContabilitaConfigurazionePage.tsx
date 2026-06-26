import { useState } from "react"
import { ChevronLeft, ChevronRight, Lock, Pencil, Plus, Trash2, Unlock } from "lucide-react"
import { useConfigurazioniBandaAnno, useRiapriAnno } from "@/hooks/useConfigurazioneAnno"
import { useCurrentUser } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import type { ConfigurazioneBandaAnno } from "@/types/configurazione-anno"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import ConfigurazioneAnnoFormDialog from "@/components/contabilita/ConfigurazioneAnnoFormDialog"
import ChiudiAnnoDialog from "@/components/contabilita/ChiudiAnnoDialog"
import DeleteConfigurazioneAnnoDialog from "@/components/contabilita/DeleteConfigurazioneAnnoDialog"

const PAGE_SIZE = 20
const COLUMNS = 8

/** Formats a Decimal serialized as a string as "€ X.XX". */
function formatImporto(value: string): string {
  return `€ ${parseFloat(value).toFixed(2)}`
}

export default function ContabilitaConfigurazionePage() {
  const { banda } = useBanda()
  const { data: user } = useCurrentUser()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useConfigurazioniBandaAnno(
    banda!.codice,
    page,
    PAGE_SIZE,
    !!banda,
  )
  const riapriAnno = useRiapriAnno()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ConfigurazioneBandaAnno | null>(null)
  const [chiudendo, setChiudendo] = useState<ConfigurazioneBandaAnno | null>(null)
  const [deleting, setDeleting] = useState<ConfigurazioneBandaAnno | null>(null)

  const configurazioni = data?.items ?? []
  const totalPages = data?.meta.total_pages ?? 1
  const canRiapri = user?.superuser === true

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (config: ConfigurazioneBandaAnno) => {
    setEditing(config)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Configurazione contabile</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuova configurazione
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Anno</TableHead>
              <TableHead>Quota attesa (€)</TableHead>
              <TableHead>Saldo cassa iniziale (€)</TableHead>
              <TableHead>Saldo banca iniziale (€)</TableHead>
              <TableHead>Voce quote</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Chiuso da</TableHead>
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
                  Errore nel caricamento delle configurazioni.
                </TableCell>
              </TableRow>
            ) : configurazioni.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS} className="py-12 text-center text-muted-foreground">
                  Nessuna configurazione presente
                </TableCell>
              </TableRow>
            ) : (
              configurazioni.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.anno}</TableCell>
                  <TableCell>{formatImporto(config.quota_annuale_attesa)}</TableCell>
                  <TableCell>{formatImporto(config.saldo_iniziale_cassa)}</TableCell>
                  <TableCell>{formatImporto(config.saldo_iniziale_banca)}</TableCell>
                  <TableCell>{config.voce_contabilita_quote?.voce_contabilita ?? "—"}</TableCell>
                  <TableCell>
                    {config.chiuso ? (
                      <Badge variant="secondary">Chiuso</Badge>
                    ) : (
                      <Badge variant="success">Aperto</Badge>
                    )}
                  </TableCell>
                  <TableCell>{config.chiuso_da_utente?.email ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(config)}
                        disabled={config.chiuso}
                        aria-label="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!config.chiuso && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setChiudendo(config)}
                          aria-label="Chiudi anno"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      )}
                      {config.chiuso && canRiapri && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => riapriAnno.mutate(config.id)}
                          disabled={riapriAnno.isPending}
                          aria-label="Riapri anno"
                        >
                          <Unlock className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(config)}
                        disabled={config.chiuso}
                        aria-label="Elimina"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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

      <ConfigurazioneAnnoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        configurazione={editing}
      />
      <ChiudiAnnoDialog
        open={chiudendo !== null}
        onOpenChange={(open) => {
          if (!open) setChiudendo(null)
        }}
        configurazione={chiudendo}
      />
      <DeleteConfigurazioneAnnoDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        configurazione={deleting}
      />
    </div>
  )
}
