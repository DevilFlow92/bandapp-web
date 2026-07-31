export type { PagedResponse, PageMeta } from "@/types/socio"

export interface TipoCorso {
  codice: number
  descrizione: string
}

export interface PersonaInCorso {
  id: number
  nome: string
  cognome: string
}

export interface TipoCorsoInCorso {
  codice: number
  descrizione: string
}

export interface Corso {
  id: number
  banda_codice: number
  tipo_corso_codice: number
  anno: number
  coordinatore_persona_id: number | null
  insegnante_persona_id: number | null
  note: string | null
  tipo_corso?: TipoCorsoInCorso
  coordinatore?: PersonaInCorso | null
  insegnante?: PersonaInCorso | null
}
