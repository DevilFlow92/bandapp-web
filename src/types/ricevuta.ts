export type { PagedResponse, PageMeta } from "@/types/socio"

export interface PersonaInRicevuta {
  id: number
  nome: string | null
  cognome: string | null
}

export interface EsternoInRicevuta {
  id: number
  codice_esterno: string
  persona: PersonaInRicevuta | null
}

export interface Ricevuta {
  id: number
  servizio_id: number | null
  esterno_id: number | null
  documento_id: number | null
  data_ricevuta: string // ISO datetime
  importo: number
  note_in_stampa: string | null
  note_fuori_stampa: string | null
  esterno?: EsternoInRicevuta | null
}
