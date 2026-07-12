import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useBanda } from "@/context/BandaContext"
import { useSoci } from "@/hooks/useSoci"
import { useEsterni } from "@/hooks/useEsterni"
import { useBande } from "@/hooks/useBande"
import { usePersonaContatti, useLookupRuoliContatto } from "@/hooks/useContatti"
import { useIscrizioni, useLookupStatiIscrizione } from "@/hooks/useIscrizioni"
import { useServizi } from "@/hooks/useServizi"
import { useRicevuteList } from "@/hooks/useRicevute"
import type { Socio } from "@/types/socio"
import type { Esterno } from "@/types/esterno"
import type { Contatto } from "@/types/contatto"
import type { Iscrizione } from "@/types/iscrizione"
import type { Servizio } from "@/types/servizio"
import type { Ricevuta } from "@/types/ricevuta"
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
  contatto: "Contatto",
  iscrizione: "Iscrizione",
  servizio: "Servizio",
  ricevuta: "Ricevuta",
}

// "contatto" and "iscrizione" depend on the socio/esterno selected in the
// same form, so they must always render after them regardless of the order
// the backend returns in entita_richieste.
const ENTITY_ORDER: Record<string, number> = {
  contatto: 1,
  iscrizione: 1,
}

function contattoLabel(contatto: Contatto, ruoloById: Map<number, string>) {
  const primary = contatto.email ?? contatto.telefono
  const ruolo = ruoloById.get(contatto.ruolo_contatto_codice)
  if (!primary) return ruolo ? `Contatto #${contatto.id} — ${ruolo}` : `Contatto #${contatto.id}`
  return ruolo ? `${primary} — ${ruolo}` : primary
}

function iscrizioneLabel(iscrizione: Iscrizione, statoById: Map<number, string>) {
  const stato = statoById.get(iscrizione.stato_iscrizione_codice)
  return stato ? `Anno ${iscrizione.anno} — ${stato}` : `Anno ${iscrizione.anno}`
}

function servizioLabel(servizio: Servizio) {
  const data = new Date(servizio.data_servizio).toLocaleDateString("it-IT")
  return `${servizio.descrizione_servizio} — ${data}`
}

function formatImporto(importo: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(importo)
}

function ricevutaLabel(ricevuta: Ricevuta) {
  const data = new Date(ricevuta.data_ricevuta).toLocaleDateString("it-IT")
  return `${data} — ${formatImporto(ricevuta.importo)}`
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
  const ruoliContattoQuery = useLookupRuoliContatto()
  const statiIscrizioneQuery = useLookupStatiIscrizione()

  const socioSelezionato = sociQuery.data?.items.find((s) => s.id === value.socio)
  const esternoSelezionato = esterniQuery.data?.items.find((e) => e.id === value.esterno)
  const contattoPersonaId = socioSelezionato?.persona?.id ?? esternoSelezionato?.persona?.id ?? null

  const contattiQuery = usePersonaContatti(
    contattoPersonaId ?? 0,
    entitaRichieste.includes("contatto") && contattoPersonaId != null,
  )
  const ruoloById = useMemo(
    () => new Map(ruoliContattoQuery.data?.map((r) => [r.codice, r.descrizione]) ?? []),
    [ruoliContattoQuery.data],
  )

  const iscrizioneSocioId = entitaRichieste.includes("socio") ? (value.socio ?? null) : null
  const iscrizioniQuery = useIscrizioni(
    1,
    50,
    iscrizioneSocioId ?? undefined,
    undefined,
    entitaRichieste.includes("iscrizione") && iscrizioneSocioId != null,
  )
  const statoById = useMemo(
    () => new Map(statiIscrizioneQuery.data?.map((s) => [s.codice, s.descrizione]) ?? []),
    [statiIscrizioneQuery.data],
  )

  const serviziQuery = useServizi(
    1,
    50,
    banda?.codice ?? 0,
    undefined,
    entitaRichieste.includes("servizio") && !!banda,
  )

  const ricevuteQuery = useRicevuteList(1, 50, entitaRichieste.includes("ricevuta"))

  const orderedEntitaRichieste = useMemo(
    () => [...entitaRichieste].sort((a, b) => (ENTITY_ORDER[a] ?? 0) - (ENTITY_ORDER[b] ?? 0)),
    [entitaRichieste],
  )

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
      {orderedEntitaRichieste.map((entita) => {
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
            {entita === "contatto" &&
              (contattoPersonaId == null ? (
                <p className="text-sm text-muted-foreground">
                  Il campo contatto richiede anche Socio o Esterno nel template.
                </p>
              ) : (
                <SearchPicker
                  items={contattiQuery.data ?? []}
                  isLoading={contattiQuery.isLoading}
                  getId={(c: Contatto) => c.id}
                  getLabel={(c: Contatto) => contattoLabel(c, ruoloById)}
                  selectedId={value.contatto}
                  onSelect={(id) => setEntity("contatto", id)}
                  onClear={() => clearEntity("contatto")}
                  placeholder="Cerca contatto…"
                  emptyLabel="Nessun contatto trovato"
                />
              ))}
            {entita === "iscrizione" &&
              (iscrizioneSocioId == null ? (
                <p className="text-sm text-muted-foreground">
                  Il campo iscrizione richiede anche Socio nel template.
                </p>
              ) : (
                <SearchPicker
                  items={iscrizioniQuery.data?.items ?? []}
                  isLoading={iscrizioniQuery.isLoading}
                  getId={(i: Iscrizione) => i.id}
                  getLabel={(i: Iscrizione) => iscrizioneLabel(i, statoById)}
                  selectedId={value.iscrizione}
                  onSelect={(id) => setEntity("iscrizione", id)}
                  onClear={() => clearEntity("iscrizione")}
                  placeholder="Cerca iscrizione…"
                  emptyLabel="Nessuna iscrizione trovata"
                />
              ))}
            {entita === "servizio" && (
              <SearchPicker
                items={serviziQuery.data?.items ?? []}
                isLoading={serviziQuery.isLoading}
                getId={(s: Servizio) => s.id}
                getLabel={servizioLabel}
                selectedId={value.servizio}
                onSelect={(id) => setEntity("servizio", id)}
                onClear={() => clearEntity("servizio")}
                placeholder="Cerca per descrizione…"
                emptyLabel="Nessun servizio trovato"
              />
            )}
            {entita === "ricevuta" && (
              <SearchPicker
                items={ricevuteQuery.data?.items ?? []}
                isLoading={ricevuteQuery.isLoading}
                getId={(r: Ricevuta) => r.id}
                getLabel={ricevutaLabel}
                selectedId={value.ricevuta}
                onSelect={(id) => setEntity("ricevuta", id)}
                onClear={() => clearEntity("ricevuta")}
                placeholder="Cerca per data o importo…"
                emptyLabel="Nessuna ricevuta trovata"
              />
            )}
            {entita !== "socio" &&
              entita !== "esterno" &&
              entita !== "banda" &&
              entita !== "contatto" &&
              entita !== "iscrizione" &&
              entita !== "servizio" &&
              entita !== "ricevuta" && (
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
