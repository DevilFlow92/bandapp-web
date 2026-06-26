export type { Persona, PagedResponse, PageMeta } from "@/types/socio"

export interface Esterno {
  id: number
  codice_esterno: string
  attivo: boolean
  persona_id: number
  persona?: {
    id: number
    nome: string
    cognome: string
    codice_fiscale: string | null
    data_nascita: string | null
  } | null
  strumento_codice: number
  strumento?: { codice: number; descrizione: string } | null
}
