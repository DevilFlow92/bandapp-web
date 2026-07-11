import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useBanda } from "@/context/BandaContext"
import { useSoci } from "@/hooks/useSoci"
import { useEsterni } from "@/hooks/useEsterni"
import { useBande } from "@/hooks/useBande"
import type { Socio } from "@/types/socio"
import type { Esterno } from "@/types/esterno"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EntitySelectorProps {
  entitaRichieste: string[]
  value: Record<string, number>
  onChange: (value: Record<string, number>) => void
}

const ENTITY_LABELS: Record<string, string> = {
  socio: "Socio",
  esterno: "Esterno",
  banda: "Banda",
}

function personLabel(
  persona: { nome: string; cognome: string } | null | undefined,
  codice: string,
) {
  const nome = persona?.nome ?? ""
  const cognome = persona?.cognome ?? ""
  return `${nome} ${cognome} — ${codice}`.trim()
}

interface SearchPickerProps<T> {
  items: T[]
  isLoading: boolean
  getId: (item: T) => number
  getLabel: (item: T) => string
  selectedId?: number
  onSelect: (id: number) => void
  onClear: () => void
  placeholder: string
  emptyLabel: string
}

function SearchPicker<T>({
  items,
  isLoading,
  getId,
  getLabel,
  selectedId,
  onSelect,
  onClear,
  placeholder,
  emptyLabel,
}: SearchPickerProps<T>) {
  const [search, setSearch] = useState("")
  const selected = items.find((item) => getId(item) === selectedId)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => getLabel(item).toLowerCase().includes(q))
  }, [items, search, getLabel])

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
        <span>{getLabel(selected)}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Cambia
        </Button>
      </div>
    )
  }

  return (
    <>
      <Input placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="max-h-48 overflow-y-auto rounded-md border">
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Caricamento…
          </div>
        ) : filtered.length > 0 ? (
          <ul className="divide-y">
            {filtered.map((item) => (
              <li key={getId(item)}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => onSelect(getId(item))}
                >
                  {getLabel(item)}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</div>
        )}
      </div>
    </>
  )
}

/**
 * Renders one selector per entity required by a template (`entita_richieste`),
 * scoped to the currently selected banda, and reports the chosen ids as a
 * `{ [entita]: id }` map suitable for the preview/generate endpoints.
 */
export default function EntitySelector({ entitaRichieste, value, onChange }: EntitySelectorProps) {
  const { banda } = useBanda()

  const sociQuery = useSoci(1, 50, banda?.codice ?? 0, entitaRichieste.includes("socio") && !!banda)
  const esterniQuery = useEsterni(
    1,
    50,
    banda?.codice ?? 0,
    entitaRichieste.includes("esterno") && !!banda,
  )
  const bandeQuery = useBande()

  function setEntity(key: string, id: number) {
    onChange({ ...value, [key]: id })
  }

  function clearEntity(key: string) {
    const next = { ...value }
    delete next[key]
    onChange(next)
  }

  const missing = entitaRichieste.filter((entita) => value[entita] == null)

  return (
    <div className="space-y-4">
      {entitaRichieste.map((entita) => {
        const label = ENTITY_LABELS[entita] ?? entita
        return (
          <div key={entita} className="space-y-2">
            <Label>{label} *</Label>
            {entita === "socio" && (
              <SearchPicker
                items={sociQuery.data?.items ?? []}
                isLoading={sociQuery.isLoading}
                getId={(s: Socio) => s.id}
                getLabel={(s: Socio) => personLabel(s.persona, s.codice_socio)}
                selectedId={value.socio}
                onSelect={(id) => setEntity("socio", id)}
                onClear={() => clearEntity("socio")}
                placeholder="Cerca per nome o cognome…"
                emptyLabel="Nessun socio trovato"
              />
            )}
            {entita === "esterno" && (
              <SearchPicker
                items={esterniQuery.data?.items ?? []}
                isLoading={esterniQuery.isLoading}
                getId={(e: Esterno) => e.id}
                getLabel={(e: Esterno) => personLabel(e.persona, e.codice_esterno)}
                selectedId={value.esterno}
                onSelect={(id) => setEntity("esterno", id)}
                onClear={() => clearEntity("esterno")}
                placeholder="Cerca per nome, cognome o codice…"
                emptyLabel="Nessun esterno trovato"
              />
            )}
            {entita === "banda" && (
              <Select
                value={value.banda != null ? String(value.banda) : undefined}
                onValueChange={(v) => setEntity("banda", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona banda…" />
                </SelectTrigger>
                <SelectContent>
                  {bandeQuery.data?.map((b) => (
                    <SelectItem key={b.codice} value={String(b.codice)}>
                      {b.descrizione}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {entita !== "socio" && entita !== "esterno" && entita !== "banda" && (
              <p className="text-sm text-muted-foreground">
                Selettore non disponibile per l&apos;entità &quot;{entita}&quot;.
              </p>
            )}
          </div>
        )
      })}

      {entitaRichieste.length === 0 && (
        <p className="text-sm text-muted-foreground">Questo modulo non richiede entità.</p>
      )}

      {missing.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Seleziona tutte le entità richieste per generare l&apos;anteprima.
        </p>
      )}
    </div>
  )
}
