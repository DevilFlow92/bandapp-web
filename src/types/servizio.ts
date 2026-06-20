export type { PagedResponse, PageMeta } from "@/types/socio"

export interface Servizio {
  id: number
  banda_codice: number
  anno: number
  descrizione_servizio: string
  data_servizio: string // ISO datetime
  indirizzo_id: number
  note: string | null
  indirizzo?: IndirizzoInServizio | null
}

export interface ProvinciaInServizio {
  codice: number
  sigla: string
}

export interface ComuneInServizio {
  codice: number
  descrizione: string
  provincia?: ProvinciaInServizio | null
}

export interface IndirizzoInServizio {
  id: number
  prima_riga: string | null
  numero_civico: string | null
  cap: string | null
  comune?: ComuneInServizio | null
}
