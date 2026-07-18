export interface Template {
  id: number
  nome: string
  descrizione: string | null
  contenuto_json: object
  entita_richieste: string[]
  sotto_cartella_id: number | null
  creato_il: string
  aggiornato_il: string
}

export interface MergeFieldDefinition {
  chiave: string
  etichetta: string
  tipo: string
}

export type MergeFieldsByEntity = Record<string, MergeFieldDefinition[]>

export interface MergeFieldsResponse {
  entita: MergeFieldsByEntity
}
