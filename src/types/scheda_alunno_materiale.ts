export type TipoMaterialeSchedaAlunno = "file" | "link"

export interface SchedaAlunnoMateriale {
  id: number
  scheda_alunno_id: number
  titolo: string
  storage_key: string | null
  nome_file_originale: string | null
  mime_type: string | null
  dimensione_bytes: number | null
  url: string | null
  caricato_da_persona_id: number | null
  data_caricamento: string
  tipo: TipoMaterialeSchedaAlunno
}
