import { useEffect, useState } from "react"
import { useComuni, useProvince, useRegioni, useStati } from "@/hooks/useLookups"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ComuneSelectProps {
  value: number | null
  onChange: (codice: number | null) => void
  label?: string
}

/**
 * Cascading Stato → Regione → Provincia → Comune selector. Each level is
 * populated from its own lookup and stays disabled until the level above it
 * has been chosen. Selecting a comune calls `onChange` with its codice.
 */
export default function ComuneSelect({ value, onChange, label }: ComuneSelectProps) {
  const [statoCodice, setStatoCodice] = useState<number | null>(null)
  const [regioneCodice, setRegioneCodice] = useState<number>()
  const [provinciaCodice, setProvinciaCodice] = useState<number>()

  const stati = useStati()
  const regioni = useRegioni(statoCodice ?? undefined)
  const province = useProvince(regioneCodice)
  const comuni = useComuni(provinciaCodice)

  // Auto-select Italia as the common default once the stati lookup has loaded.
  // Italia has the stable codice 113 (it lives on page 2 of the stati lookup,
  // which useStati loads in full), so we set it directly rather than searching
  // the list by name. Waiting for isSuccess ensures the option exists before we
  // select it; the statoCodice === null guard avoids clobbering a later change.
  useEffect(() => {
    if (stati.isSuccess && statoCodice === null) {
      setStatoCodice(113)
    }
  }, [stati.isSuccess])

  // TODO: reverse-lookup for edit mode. We have no GET /comuni/{codice}
  // endpoint, so given only `value` we cannot walk back up to its provincia,
  // regione and stato. For now the upper levels stay blank in edit mode and
  // the Comune select simply shows the incoming codice; the user can
  // re-select from the top if they need to change it.

  const handleStatoChange = (next: string) => {
    setStatoCodice(Number(next))
    setRegioneCodice(undefined)
    setProvinciaCodice(undefined)
    onChange(null)
  }

  const handleRegioneChange = (next: string) => {
    setRegioneCodice(Number(next))
    setProvinciaCodice(undefined)
    onChange(null)
  }

  const handleProvinciaChange = (next: string) => {
    setProvinciaCodice(Number(next))
    onChange(null)
  }

  const handleComuneChange = (next: string) => {
    onChange(Number(next))
  }

  // In edit mode `value` may not be present in the loaded comuni list (we only
  // load the comuni of the selected provincia). Render a synthetic item so the
  // trigger can still display the incoming codice.
  const valueMissingFromList = value != null && !comuni.data?.some((c) => c.codice === value)

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}

      <div className="space-y-2">
        <Label htmlFor="comune-stato" className="text-xs text-muted-foreground">
          Stato
        </Label>
        <Select
          value={statoCodice != null ? String(statoCodice) : undefined}
          onValueChange={handleStatoChange}
        >
          <SelectTrigger id="comune-stato">
            <SelectValue placeholder="Seleziona stato…" />
          </SelectTrigger>
          <SelectContent>
            {stati.data?.map((s) => (
              <SelectItem key={s.codice} value={String(s.codice)}>
                {s.descrizione}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comune-regione" className="text-xs text-muted-foreground">
          Regione
        </Label>
        <Select
          value={regioneCodice != null ? String(regioneCodice) : undefined}
          onValueChange={handleRegioneChange}
          disabled={statoCodice == null}
        >
          <SelectTrigger id="comune-regione">
            <SelectValue placeholder="Seleziona regione…" />
          </SelectTrigger>
          <SelectContent>
            {regioni.data?.map((r) => (
              <SelectItem key={r.codice} value={String(r.codice)}>
                {r.descrizione}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comune-provincia" className="text-xs text-muted-foreground">
          Provincia
        </Label>
        <Select
          value={provinciaCodice != null ? String(provinciaCodice) : undefined}
          onValueChange={handleProvinciaChange}
          disabled={regioneCodice == null}
        >
          <SelectTrigger id="comune-provincia">
            <SelectValue placeholder="Seleziona provincia…" />
          </SelectTrigger>
          <SelectContent>
            {province.data?.map((p) => (
              <SelectItem key={p.codice} value={String(p.codice)}>
                {p.descrizione}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comune-comune" className="text-xs text-muted-foreground">
          Comune
        </Label>
        <Select
          value={value != null ? String(value) : undefined}
          onValueChange={handleComuneChange}
          disabled={provinciaCodice == null}
        >
          <SelectTrigger id="comune-comune">
            <SelectValue placeholder="Seleziona comune…" />
          </SelectTrigger>
          <SelectContent>
            {valueMissingFromList && <SelectItem value={String(value)}>{value}</SelectItem>}
            {comuni.data?.map((c) => (
              <SelectItem key={c.codice} value={String(c.codice)}>
                {c.descrizione}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
