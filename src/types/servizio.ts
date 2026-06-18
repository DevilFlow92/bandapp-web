export type { PagedResponse, PageMeta } from "@/types/socio"

export interface Servizio {
  id: number
  titolo: string
  data: string
  ora_inizio: string | null
  ora_fine: string | null
  luogo: string
  note: string | null
  indirizzo_id: number | null
}

export interface Indirizzo {
  id: number
  via: string
  civico: string | null
  comune_codice: number
  comune: { nome: string }
}
