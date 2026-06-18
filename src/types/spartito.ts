export type { PagedResponse, PageMeta, Lookup } from "@/types/socio"

export interface TipoSpartito {
  codice: number
  descrizione: string
}

export interface Spartito {
  id: number
  titolo: string
  autore: string | null
  anno: number | null
  note: string | null
  tipo_spartito_codice: number
  tipo_spartito: { codice: number; descrizione: string }
  strumento_codice: number | null
  strumento: { codice: number; descrizione: string } | null
  scaffale: string | null
  ripiano: string | null
  cartella: string | null
  documento_id: number | null
}
