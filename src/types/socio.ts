export interface Persona {
  id: number
  nome: string
  cognome: string
  codice_fiscale: string | null
  data_nascita: string | null
  comune_nascita_codice: number | null
  comune_nascita?: { codice: number; descrizione: string } | null
}

export interface Socio {
  id: number
  codice_socio: string
  data_ingresso: string
  attivo: boolean
  strumento_codice: number | null
  strumento?: { codice: number; descrizione: string } | null
  ruolo_banda_codice: number | null
  ruolo_banda?: { codice: number; descrizione: string } | null
  persona_id: number
  persona?: Persona
}

export interface PageMeta {
  total_items: number
  total_pages: number
  page: number
  page_size: number
}

export interface PagedResponse<T> {
  items: T[]
  meta: PageMeta
}

export interface Lookup {
  codice: number
  descrizione: string
}
