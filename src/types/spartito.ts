export type { PagedResponse, PageMeta, Lookup } from "@/types/socio"

export interface TipoSpartito {
  codice: number
  descrizione: string
}

export interface NomeParte {
  id: number
  nome: string
  tipo_spartito_codice: number
  banda_codice: number
  url_riferimento: string | null
  note: string | null
  tipo_spartito?: { codice: number; descrizione: string } | null
  num_parti: number
}

export interface Spartito {
  id: number
  nome_parte_id: number
  banda_codice: number
  tipo_spartito_codice: number
  strumento_codice: number | null
  documento_id: number | null
  scaffale: string | null
  ripiano: string | null
  cartella: string | null
  nome_parte?: { id: number; nome: string } | null
  tipo_spartito?: { codice: number; descrizione: string } | null
  strumento?: { codice: number; descrizione: string } | null
  documento?: { id: number; nome: string } | null
}

/** Shape returned by POST /documenti/ after a successful upload. */
export interface DocumentoResponse {
  id: number
  nome: string
  mime_type: string
  dimensione_bytes: number
  caricato_il: string
  note: string | null
  file_path: string
}
