export interface TipoDocumento {
  codice: number
  descrizione: string
}

export interface SottoCartellaInDocumento {
  id: number
  nome: string
  macro_sezione_codice: number
}

export interface Documento {
  id: number
  nome: string
  tipo_documento_codice: number | null
  tipo_documento?: TipoDocumento | null
  mime_type: string
  dimensione_bytes: number
  caricato_il: string // ISO datetime
  note: string | null
  file_path: string
  sotto_cartella_id: number | null
  sotto_cartella: SottoCartellaInDocumento | null
}
