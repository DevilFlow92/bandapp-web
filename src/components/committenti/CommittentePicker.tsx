import { useMemo, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { useAllCommittenti } from "@/hooks/useCommittenti"
import type { Committente } from "@/types/committente"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import CommittenteFormDialog from "@/components/committenti/CommittenteFormDialog"

interface CommittentePickerProps {
  bandaCodice: number
  value: number | null
  onChange: (id: number | null) => void
}

/**
 * Reusable Committente search/select control, following the same
 * search-and-pick pattern as the SearchPicker in
 * src/components/modulistica/EntitySelector.tsx. Used both on the
 * Committenti page (implicitly, via the same list) and from the Servizio
 * form to attach/detach a committente.
 */
export default function CommittentePicker({
  bandaCodice,
  value,
  onChange,
}: CommittentePickerProps) {
  const [search, setSearch] = useState("")
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const { data, isLoading } = useAllCommittenti(bandaCodice, bandaCodice > 0)
  const items = data ?? []
  const selected = items.find((c) => c.id === value)

  const trimmedSearch = search.trim()
  const filtered = useMemo(() => {
    const q = trimmedSearch.toLowerCase()
    if (!q) return items
    return items.filter((c: Committente) => c.denominazione.toLowerCase().includes(q))
  }, [items, trimmedSearch])

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
        <span>{selected.denominazione}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Cambia
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Cerca committente per denominazione…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-48 overflow-y-auto rounded-md border">
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Caricamento…
          </div>
        ) : (
          <ul className="divide-y">
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
                onClick={() => onChange(null)}
              >
                Nessun committente
              </button>
            </li>
            {filtered.length > 0 ? (
              filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => onChange(c.id)}
                  >
                    {c.denominazione}
                  </button>
                </li>
              ))
            ) : trimmedSearch ? (
              <li>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-accent"
                  onClick={() => setQuickCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  Crea &quot;{trimmedSearch}&quot; come nuovo committente
                </button>
              </li>
            ) : (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Nessun committente trovato
              </li>
            )}
          </ul>
        )}
      </div>

      <CommittenteFormDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        initialDenominazione={trimmedSearch}
        onSaved={(created) => {
          onChange(created.id)
          setSearch("")
        }}
      />
    </div>
  )
}
