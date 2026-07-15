import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ComuneSelect from "@/components/ui/ComuneSelect"
import type { CreateIndirizzoInput } from "@/types/indirizzo"
import type { Lookup } from "@/types/socio"

interface IndirizzoFormProps {
  value: CreateIndirizzoInput
  onChange: (value: CreateIndirizzoInput) => void
  tipi: Lookup[] | undefined
}

/** Field set shared between IndirizziSection's inline form and the socio wizard step. */
export default function IndirizzoForm({ value, onChange, tipi }: IndirizzoFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tipo-indirizzo">Tipo indirizzo</Label>
        <Select
          value={value.tipo_indirizzo_codice ? String(value.tipo_indirizzo_codice) : undefined}
          onValueChange={(v) => onChange({ ...value, tipo_indirizzo_codice: Number(v) })}
        >
          <SelectTrigger id="tipo-indirizzo">
            <SelectValue placeholder="Seleziona tipo…" />
          </SelectTrigger>
          <SelectContent>
            {tipi?.map((t) => (
              <SelectItem key={t.codice} value={String(t.codice)}>
                {t.descrizione}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prima-riga">Prima riga *</Label>
          <Input
            id="prima-riga"
            value={value.prima_riga}
            onChange={(e) => onChange({ ...value, prima_riga: e.target.value })}
            placeholder="Via / Piazza…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numero-civico">Numero civico</Label>
          <Input
            id="numero-civico"
            value={value.numero_civico ?? ""}
            onChange={(e) => onChange({ ...value, numero_civico: e.target.value || null })}
            placeholder="es. 12/A"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cap">CAP</Label>
          <Input
            id="cap"
            value={value.cap ?? ""}
            onChange={(e) => onChange({ ...value, cap: e.target.value || null })}
            placeholder="es. 00100"
          />
        </div>
      </div>

      <ComuneSelect
        label="Comune"
        value={value.comune_codice ?? null}
        onChange={(codice) => onChange({ ...value, comune_codice: codice })}
      />
    </div>
  )
}
