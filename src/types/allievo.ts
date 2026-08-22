export type { Persona, PagedResponse, PageMeta } from "@/types/socio"

export interface Allievo {
  id: number
  codice_allievo: string
  persona_id: number
  persona?: {
    id: number
    nome: string
    cognome: string
    codice_fiscale: string | null
    data_nascita: string | null
  } | null
  indirizzo_id: number | null
  indirizzo?: {
    id: number
    prima_riga: string | null
    seconda_riga: string | null
    cap: string | null
    numero_civico: string | null
  } | null
}
