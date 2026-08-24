export interface SchedaAlunnoAutovalutazione {
  id: number
  scheda_alunno_id: number
  persona_id: number
  testo: string
  data_creazione: string
  data_modifica: string | null
}
