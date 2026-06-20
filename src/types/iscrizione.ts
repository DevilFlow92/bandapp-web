export interface Iscrizione {
  id: number
  socio_id: number
  anno: number
  quota_partecipazione: number
  stato_iscrizione_codice: number
  data_iscrizione: string // ISO date
  documento_id: number | null
  ricevuta_id: number | null
  note: string | null
}
