import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useBanda } from "@/context/BandaContext"
import { useNomeParti } from "@/hooks/useSpartiti"
import { useCreateRepertorioItem } from "@/hooks/useRepertorio"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AddBranoRepertorioDialogProps {
  servizioId: number
  /** Suggested position for the new item; defaults to the end of the program. */
  nextOrdine: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** nome_parte_id values already in the repertorio, filtered out of the results. */
  existingNomeParteIds: number[]
}

/**
 * Search/select control to add a brano (NomeParte) to a servizio's repertorio,
 * with an editable ordine field for its position in the program. Follows the
 * same search-and-pick pattern as AddPersonaOrganicoDialog, but searches the
 * NomeParte archive server-side via useNomeParti since it can be large.
 */
export default function AddBranoRepertorioDialog({
  servizioId,
  nextOrdine,
  open,
  onOpenChange,
  existingNomeParteIds,
}: AddBranoRepertorioDialogProps) {
  const { toast } = useToast()
  const { banda } = useBanda()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [ordine, setOrdine] = useState(nextOrdine)
  const createRepertorioItem = useCreateRepertorioItem()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (open) {
      setSearch("")
      setDebouncedSearch("")
      setOrdine(nextOrdine)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const { data, isLoading } = useNomeParti(
    banda?.codice ?? 0,
    1,
    20,
    undefined,
    open ? debouncedSearch || undefined : undefined,
  )

  const excluded = useMemo(() => new Set(existingNomeParteIds), [existingNomeParteIds])
  const options = useMemo(
    () => (data?.items ?? []).filter((n) => !excluded.has(n.id)),
    [data, excluded],
  )

  const handleSelect = async (nomeParteId: number) => {
    try {
      await createRepertorioItem.mutateAsync({
        servizio_id: servizioId,
        nome_parte_id: nomeParteId,
        ordine,
      })
      toast({ title: "Brano aggiunto al repertorio" })
      onOpenChange(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi brano</DialogTitle>
          <DialogDescription>
            Cerca e seleziona un brano dall'archivio spartiti da aggiungere al repertorio del
            servizio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="repertorio-ordine">Ordine</Label>
            <Input
              id="repertorio-ordine"
              type="number"
              min={1}
              value={ordine}
              onChange={(e) => setOrdine(Number(e.target.value))}
              className="w-24"
            />
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Cerca per nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {isLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Caricamento…
                </div>
              ) : options.length > 0 ? (
                <ul className="divide-y">
                  {options.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                        onClick={() => handleSelect(o.id)}
                        disabled={createRepertorioItem.isPending}
                      >
                        {o.nome}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">Nessun brano trovato</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
