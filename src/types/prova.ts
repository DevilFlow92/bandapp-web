import type { IndirizzoInServizio } from "@/types/servizio"

export type { PagedResponse, PageMeta } from "@/types/socio"

export interface ServizioInProva {
  id: number
  descrizione_servizio: string
  data_servizio: string // ISO datetime
}

export interface Prova {
  id: number
  banda_codice: number
  data_prova: string // ISO datetime
  indirizzo_id: number | null
  servizio_id: number | null
  note: string | null
  indirizzo?: IndirizzoInServizio | null
  servizio?: ServizioInProva | null
}
