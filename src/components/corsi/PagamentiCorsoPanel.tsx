import { useState, type FormEvent } from "react"
import { Loader2, Plus, Receipt, Trash2 } from "lucide-react"
import {
  useCreatePagamentoCorso,
  useDeletePagamentoCorso,
  usePagamentiCorsoByIscrizione,
} from "@/hooks/usePagamentiCorso"
import { usePermission } from "@/hooks/useAuth"
import { useConfirm } from "@/hooks/useConfirm"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import type { PagamentoCorso } from "@/types/pagamento_corso"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface PagamentiCorsoPanelProps {
  iscrizioneCorsoId: number
  colSpan: number
}

interface FormState {
  data_pagamento: string
  importo: string
  note: string
}

/** Data odierna in formato "YYYY-MM-DD" per l'input date. */
function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const emptyForm: FormState = {
  data_pagamento: "",
  importo: "",
  note: "",
}

function formatDataPagamento(iso: string): string {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

/**
 * Elenco pagamenti di una singola iscrizione corso e form di registrazione di
 * un nuovo pagamento. Ogni pagamento genera lato backend, nella stessa
 * transazione, una Ricevuta (RISCOSSIONE) e un movimento di FlussoCassa
 * (AUTO_PAGAMENTO_CORSO): mostriamo il riferimento alla ricevuta generata
 * direttamente in tabella, così non serve andare a cercarla altrove.
 */
export default function PagamentiCorsoPanel({
  iscrizioneCorsoId,
  colSpan,
}: PagamentiCorsoPanelProps) {
  const canWrite = usePermission("corsi:write")
  const { data, isLoading } = usePagamentiCorsoByIscrizione(iscrizioneCorsoId, 1, 100)
  const createPagamento = useCreatePagamentoCorso()
  const deletePagamento = useDeletePagamentoCorso()
  const confirm = useConfirm()
  const { toast } = useToast()

  const pagamenti = data?.items ?? []
  const totaleIncassato = pagamenti.reduce((sum, p) => sum + p.importo, 0)
  const colCount = canWrite ? 4 : 3

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const openForm = () => {
    setForm({ ...emptyForm, data_pagamento: today() })
    setError(null)
    setShowForm(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const importo = Number(form.importo)
    if (Number.isNaN(importo) || importo <= 0) {
      setError("L'importo deve essere un numero maggiore di zero.")
      return
    }

    try {
      await createPagamento.mutateAsync({
        iscrizione_corso_id: iscrizioneCorsoId,
        data_pagamento: form.data_pagamento,
        importo,
        note: form.note.trim() || null,
      })
      toast({
        title: "Pagamento registrato",
        description: "Ricevuta e movimento di cassa generati automaticamente.",
      })
      setShowForm(false)
    } catch (err) {
      // Include il caso "configurazione contabile mancante" (422): il backend
      // restituisce già un messaggio chiaro e azionabile, mostrato così com'è.
      toast({
        variant: "destructive",
        title: "Impossibile registrare il pagamento",
        description: getErrorMessage(err),
      })
    }
  }

  const handleDelete = async (pagamento: PagamentoCorso) => {
    const ok = await confirm({
      title: "Elimina pagamento",
      description: `Eliminare il pagamento di € ${pagamento.importo.toFixed(2)} del ${formatDataPagamento(pagamento.data_pagamento)}? Verranno eliminati anche la ricevuta e il movimento di cassa collegati. L'operazione non è reversibile.`,
      confirmLabel: "Elimina",
      variant: "destructive",
    })
    if (!ok) return

    try {
      await deletePagamento.mutateAsync(pagamento.id)
      toast({ title: "Pagamento eliminato" })
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="bg-muted/30 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Pagamenti</h3>
              {!isLoading && (
                <p className="text-xs text-muted-foreground">
                  {pagamenti.length === 0
                    ? "Nessun pagamento registrato"
                    : `${pagamenti.length} pagamenti, totale € ${totaleIncassato.toFixed(2)}`}
                </p>
              )}
            </div>
            {canWrite && !showForm && (
              <Button size="sm" variant="outline" onClick={openForm}>
                <Plus className="mr-2 h-4 w-4" />
                Registra pagamento
              </Button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-3 rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">
                Registrando il pagamento verranno generati automaticamente una Ricevuta
                (Riscossione) e un movimento di Flusso Cassa collegati.
              </p>
              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="data_pagamento">Data pagamento *</Label>
                  <Input
                    id="data_pagamento"
                    type="date"
                    required
                    value={form.data_pagamento}
                    onChange={(e) => setForm((f) => ({ ...f, data_pagamento: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="importo">Importo (€) *</Label>
                  <Input
                    id="importo"
                    type="number"
                    step="0.01"
                    required
                    value={form.importo}
                    onChange={(e) => setForm((f) => ({ ...f, importo: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="pagamento_note">Note</Label>
                <Input
                  id="pagamento_note"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={createPagamento.isPending}
                >
                  Annulla
                </Button>
                <Button type="submit" size="sm" disabled={createPagamento.isPending}>
                  {createPagamento.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registra
                </Button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <div className="rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Ricevuta</TableHead>
                    {canWrite && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: colCount }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : pagamenti.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={colCount}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nessun pagamento registrato
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagamenti.map((pagamento) => (
                      <TableRow key={pagamento.id}>
                        <TableCell>{formatDataPagamento(pagamento.data_pagamento)}</TableCell>
                        <TableCell>€ {pagamento.importo.toFixed(2)}</TableCell>
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
                        {canWrite && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(pagamento)}
                              aria-label="Elimina pagamento"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
