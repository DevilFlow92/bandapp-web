export interface Template {
  id: number
  documento_id: number
  nome: string
  descrizione: string | null
  creato_il: string
  aggiornato_il: string
  documento?: {
    id: number
    nome: string
    mime_type: string
    dimensione_bytes: number
  } | null
}
