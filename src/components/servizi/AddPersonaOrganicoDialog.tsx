import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useBanda } from "@/context/BandaContext"
import { useSoci } from "@/hooks/useSoci"
import { useEsterni } from "@/hooks/useEsterni"
import { useCreatePresenza } from "@/hooks/usePresenze"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AddPersonaOrganicoDialogProps {
  servizioId: number
  /** Which roster to search. Soci and esterni stay separate entities in the UI. */
  tipo: "socio" | "esterno"
  open: boolean
  onOpenChange: (open: boolean) => void
  /** persona_id values already in the organico, filtered out of the results. */
  existingPersonaIds: number[]
}

function personaLabel(
  persona: { nome: string; cognome: string } | null | undefined,
  codice: string,
): string {
  const nome = persona?.nome ?? ""
  const cognome = persona?.cognome ?? ""
  return `${nome} ${cognome} — ${codice}`.trim()
}

/**
 * Search/select control to add a socio or esterno to a servizio's organico.
 * Follows the same search-and-pick pattern as CommittentePicker and the
 * esterno picker in RicevutaFormDialog. Soci and esterni have no text-search
 * endpoint, so the banda's roster is fetched once and filtered client-side.
 */
export default function AddPersonaOrganicoDialog({
  servizioId,
  tipo,
  open,
  onOpenChange,
  existingPersonaIds,
}: AddPersonaOrganicoDialogProps) {
  const { toast } = useToast()
  const { banda } = useBanda()
  const [search, setSearch] = useState("")
  const createPresenza = useCreatePresenza()

  const sociQuery = useSoci(1, 100, banda?.codice ?? 0, open && tipo === "socio" && !!banda)
  const esterniQuery = useEsterni(1, 100, banda?.codice ?? 0, open && tipo === "esterno" && !!banda)

  const isLoading = tipo === "socio" ? sociQuery.isLoading : esterniQuery.isLoading

  const options = useMemo(() => {
    const excluded = new Set(existingPersonaIds)
    if (tipo === "socio") {
      return (sociQuery.data?.items ?? [])
        .filter((s) => !excluded.has(s.persona_id))
        .map((s) => ({ personaId: s.persona_id, label: personaLabel(s.persona, s.codice_socio) }))
    }
    return (esterniQuery.data?.items ?? [])
      .filter((e) => !excluded.has(e.persona_id))
      .map((e) => ({ personaId: e.persona_id, label: personaLabel(e.persona, e.codice_esterno) }))
  }, [tipo, sociQuery.data, esterniQuery.data, existingPersonaIds])

  const trimmedSearch = search.trim()
  const filtered = useMemo(() => {
    const q = trimmedSearch.toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, trimmedSearch])

  const handleSelect = async (personaId: number) => {
    try {
      await createPresenza.mutateAsync({ servizio_id: servizioId, persona_id: personaId })
      toast({
        title: tipo === "socio" ? "Socio aggiunto all'organico" : "Esterno aggiunto all'organico",
      })
      setSearch("")
      onOpenChange(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tipo === "socio" ? "Aggiungi socio" : "Aggiungi esterno"}</DialogTitle>
          <DialogDescription>
            Cerca e seleziona {tipo === "socio" ? "un socio" : "un esterno"} da aggiungere
            all'organico del servizio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            placeholder="Cerca per nome, cognome o codice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento…
              </div>
            ) : filtered.length > 0 ? (
              <ul className="divide-y">
                {filtered.map((o) => (
                  <li key={o.personaId}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                      onClick={() => handleSelect(o.personaId)}
                      disabled={createPresenza.isPending}
                    >
                      {o.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {tipo === "socio" ? "Nessun socio trovato" : "Nessun esterno trovato"}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
