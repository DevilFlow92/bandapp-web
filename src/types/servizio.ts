export type { PagedResponse, PageMeta } from "@/types/socio"

export interface CommittenteInServizio {
  id: number
  denominazione: string
  codice_fiscale_piva: string | null
}

export interface Servizio {
  id: number
  banda_codice: number
  anno: number
  descrizione_servizio: string
  data_servizio: string // ISO datetime
  indirizzo_id: number
  note: string | null
  indirizzo?: IndirizzoInServizio | null
  committente_id: number | null
  referente: string | null
  compenso_pattuito: number | null
  committente?: CommittenteInServizio | null
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
