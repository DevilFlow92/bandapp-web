export type { PagedResponse, PageMeta } from "@/types/socio"

export type TipoRicevuta = "PAGAMENTO" | "RISCOSSIONE"

export interface PersonaInRicevuta {
  id: number
  nome: string | null
  cognome: string | null
}

export interface Ricevuta {
  id: number
  servizio_id: number | null
  persona_id: number | null
  documento_id: number | null
  data_ricevuta: string // ISO datetime
  importo: number
  tipo_ricevuta: TipoRicevuta | null
  note_in_stampa: string | null
  note_fuori_stampa: string | null
  persona?: PersonaInRicevuta | null
}
