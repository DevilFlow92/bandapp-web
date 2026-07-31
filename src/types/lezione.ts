import type { IndirizzoInServizio } from "@/types/servizio"

export type { PagedResponse, PageMeta } from "@/types/socio"

export interface CorsoInLezione {
  id: number
  anno: number
}

export interface Lezione {
  id: number
  corso_id: number
  data_lezione: string // ISO datetime
  indirizzo_id: number | null
  note: string | null
  corso?: CorsoInLezione
  indirizzo?: IndirizzoInServizio | null
}
