import type { CreateIndirizzoInput } from "@/hooks/useServizi"
import type { IndirizzoInServizio } from "@/types/servizio"
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
import type { Lookup } from "@/types/socio"

/** Default tipo indirizzo "Servizio" (codice 4), pre-selected for new servizi/prove. */
export const DEFAULT_TIPO_INDIRIZZO_CODICE = "4"

export interface IndirizzoFormState {
  tipo_indirizzo_codice: string
  prima_riga: string
  numero_civico: string
  cap: string
  comune_codice: number | null
}

export const emptyIndirizzoForm: IndirizzoFormState = {
  tipo_indirizzo_codice: DEFAULT_TIPO_INDIRIZZO_CODICE,
  prima_riga: "",
  numero_civico: "",
  cap: "",
  comune_codice: null,
}

export function formatIndirizzoServizio(ind: IndirizzoInServizio | null | undefined): string {
  if (!ind) return "—"
  const parts = [
    ind.prima_riga,
    ind.numero_civico,
    ind.cap,
    ind.comune?.descrizione,
    ind.comune?.provincia?.sigla ? `(${ind.comune.provincia.sigla})` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : "—"
}

/**
 * Validates the inline indirizzo form and, if a via/piazza was entered,
 * creates the indirizzo. Returns the new id, or undefined when the address
 * was left blank (address is always optional). Throws when some fields were
 * filled but the required via/piazza was not.
 */
export async function resolveIndirizzoId(
  indirizzo: IndirizzoFormState,
  createIndirizzoAsync: (input: CreateIndirizzoInput) => Promise<IndirizzoInServizio>,
): Promise<number | undefined> {
  const primaRiga = indirizzo.prima_riga.trim()
  const anyAddressFilled =
    primaRiga !== "" ||
    indirizzo.numero_civico.trim() !== "" ||
    indirizzo.cap.trim() !== "" ||
    indirizzo.comune_codice !== null

  if (anyAddressFilled && !primaRiga) {
    throw new Error("La via / piazza è obbligatoria se inserisci un indirizzo.")
  }

  if (!primaRiga) return undefined

  const created = await createIndirizzoAsync({
    tipo_indirizzo_codice: Number(indirizzo.tipo_indirizzo_codice),
    prima_riga: primaRiga,
    numero_civico: indirizzo.numero_civico.trim() || null,
    cap: indirizzo.cap.trim() || null,
    comune_codice: indirizzo.comune_codice,
  })
  return created.id
}

interface IndirizzoFieldProps {
  /** The entity's current indirizzo_id, if any. Only a non-null id is treated as "already associated". */
  existingIndirizzoId: number | null | undefined
  existingIndirizzo: IndirizzoInServizio | null | undefined
  value: IndirizzoFormState
  onChange: (value: IndirizzoFormState) => void
  tipiIndirizzo: Lookup[] | undefined
}

/**
 * Renders the Indirizzo section of the Servizio/Prova forms: a read-only
 * summary when an indirizzo is already associated, or the create-inline
 * fields otherwise (covers both "new entity" and "existing entity without an
 * indirizzo yet").
 */
export default function IndirizzoField({
  existingIndirizzoId,
  existingIndirizzo,
  value,
  onChange,
  tipiIndirizzo,
}: IndirizzoFieldProps) {
  if (existingIndirizzoId != null) {
    return (
      <div className="space-y-1 rounded-md border px-3 py-2 text-sm">
        <p>{formatIndirizzoServizio(existingIndirizzo)}</p>
        <p className="text-xs text-muted-foreground">
          Indirizzo già associato (ID: {existingIndirizzoId}). Per modificare l'indirizzo, gestirlo
          separatamente.
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Facoltativo. Compila la via per creare e associare un nuovo indirizzo.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tipo_indirizzo">Tipo</Label>
          <Select
            value={value.tipo_indirizzo_codice}
            onValueChange={(v) => onChange({ ...value, tipo_indirizzo_codice: v })}
          >
            <SelectTrigger id="tipo_indirizzo">
              <SelectValue placeholder="Seleziona…" />
            </SelectTrigger>
            <SelectContent>
              {tipiIndirizzo?.map((tipo) => (
                <SelectItem key={tipo.codice} value={String(tipo.codice)}>
                  {tipo.descrizione}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="numero_civico">Numero civico</Label>
          <Input
            id="numero_civico"
            value={value.numero_civico}
            onChange={(e) => onChange({ ...value, numero_civico: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prima_riga">Via / Piazza</Label>
        <Input
          id="prima_riga"
          value={value.prima_riga}
          onChange={(e) => onChange({ ...value, prima_riga: e.target.value })}
        />
      </div>

      <div className="space-y-2 sm:max-w-[12rem]">
        <Label htmlFor="cap">CAP</Label>
        <Input
          id="cap"
          value={value.cap}
          onChange={(e) => onChange({ ...value, cap: e.target.value })}
        />
      </div>

      <ComuneSelect
        value={value.comune_codice}
        onChange={(codice) => onChange({ ...value, comune_codice: codice })}
        label="Comune"
      />
    </>
  )
}
