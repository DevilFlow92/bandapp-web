import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAllServizi } from "@/hooks/useServizi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ServizioPickerProps {
  bandaCodice: number
  value: number | null
  onChange: (id: number | null) => void
}

/** Formats an ISO datetime string as "DD/MM/YYYY". */
function formatDataServizio(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

/**
 * Search/select control to optionally orient a prova to an existing servizio,
 * following the same search-and-pick pattern as CommittentePicker.
 */
export default function ServizioPicker({ bandaCodice, value, onChange }: ServizioPickerProps) {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useAllServizi(bandaCodice, bandaCodice > 0)
  const items = data ?? []
  const selected = items.find((s) => s.id === value)

  const trimmedSearch = search.trim()
  const filtered = useMemo(() => {
    const q = trimmedSearch.toLowerCase()
    if (!q) return items
    return items.filter((s) => s.descrizione_servizio.toLowerCase().includes(q))
  }, [items, trimmedSearch])

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
        <span>
          {selected.descrizione_servizio} — {formatDataServizio(selected.data_servizio)}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Cambia
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Cerca servizio per descrizione…"
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
                Nessun servizio (prova standalone)
              </button>
            </li>
            {filtered.length > 0 ? (
              filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => onChange(s.id)}
                  >
                    {s.descrizione_servizio} — {formatDataServizio(s.data_servizio)}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-muted-foreground">Nessun servizio trovato</li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
