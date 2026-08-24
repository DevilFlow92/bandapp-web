import type { PersonaInSchedaAlunno } from "@/types/scheda_alunno"
import type { StatoVoceProgramma } from "@/types/scheda_alunno_voce"

export interface SchedaAlunnoVoceStoricoResponse {
  id: number
  stato_precedente: StatoVoceProgramma | null
  stato_nuovo: StatoVoceProgramma
  data_modifica: string
  modificato_da: PersonaInSchedaAlunno | null
  /** null se la voce di catalogo di origine è stata cancellata: la riga resta comunque consultabile. */
  voce_testo: string | null
}
