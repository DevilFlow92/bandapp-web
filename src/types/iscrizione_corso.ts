export type { PagedResponse, PageMeta } from "@/types/socio"

export interface CorsoInIscrizioneCorso {
  id: number
  anno: number
}

export interface PersonaInIscrizioneCorso {
  id: number
  nome: string | null
  cognome: string | null
}

export interface StatoIscrizioneCorsoNested {
  codice: number
  descrizione: string
}

export interface DocumentoInIscrizioneCorso {
  id: number
  nome: string
  mime_type: string
}

export interface IscrizioneCorso {
  id: number
  corso_id: number
  persona_id: number
  stato_iscrizione_corso_codice: number
  documento_id: number | null
  data_iscrizione: string // ISO date
  note: string | null
  corso?: CorsoInIscrizioneCorso
  persona?: PersonaInIscrizioneCorso
  stato_iscrizione_corso?: StatoIscrizioneCorsoNested
  documento?: DocumentoInIscrizioneCorso | null
}
