import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Lookup } from "@/types/socio"

export interface IscrizioneFormState {
  anno: string
  data_iscrizione: string
  quota_partecipazione: string
  stato_iscrizione_codice: string
  note: string
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function emptyIscrizioneForm(): IscrizioneFormState {
  return {
    anno: String(new Date().getFullYear()),
    data_iscrizione: "",
    quota_partecipazione: "",
    stato_iscrizione_codice: "",
    note: "",
  }
}

interface IscrizioneFormProps {
  value: IscrizioneFormState
  onChange: (value: IscrizioneFormState) => void
  stati: Lookup[] | undefined
}

/** Field set shared between IscrizioneFormDialog and the socio wizard step. */
export default function IscrizioneForm({ value, onChange, stati }: IscrizioneFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="anno">Anno *</Label>
          <Input
            id="anno"
            type="number"
            required
            value={value.anno}
            onChange={(e) => onChange({ ...value, anno: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_iscrizione">Data iscrizione *</Label>
          <Input
            id="data_iscrizione"
            type="date"
            required
            value={value.data_iscrizione}
            onChange={(e) => onChange({ ...value, data_iscrizione: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quota">Quota partecipazione *</Label>
          <Input
            id="quota"
            type="number"
            step="0.01"
            required
            value={value.quota_partecipazione}
            onChange={(e) => onChange({ ...value, quota_partecipazione: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stato">Stato iscrizione *</Label>
          <Select
            value={value.stato_iscrizione_codice}
            onValueChange={(v) => onChange({ ...value, stato_iscrizione_codice: v })}
          >
            <SelectTrigger id="stato">
              <SelectValue placeholder="Seleziona…" />
            </SelectTrigger>
            <SelectContent>
              {stati?.map((s) => (
                <SelectItem key={s.codice} value={String(s.codice)}>
                  {s.descrizione}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <textarea
          id="note"
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      </div>
    </div>
  )
}
