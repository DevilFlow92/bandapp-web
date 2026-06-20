export type { PagedResponse, PageMeta, Lookup } from "@/types/socio"

export interface TipoSpartito {
  codice: number
  descrizione: string
}

export interface Spartito {
  id: number
  tipo_spartito_codice: number
  strumento_codice: number | null
  documento_id: number
  scaffale: string | null
  ripiano: string | null
  cartella: string | null
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
