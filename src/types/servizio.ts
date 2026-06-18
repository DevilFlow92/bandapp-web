export type { PagedResponse, PageMeta } from "@/types/socio"

export interface Servizio {
  id: number
  banda_codice: number
  anno: number
  descrizione_servizio: string
  data_servizio: string // ISO datetime
  indirizzo_id: number
  note: string | null
  indirizzo?: Indirizzo | null
}

export interface Indirizzo {
  id: number
  via: string
  civico: string | null
  comune_codice: number
  comune?: { codice: number; descrizione: string } | null
}
