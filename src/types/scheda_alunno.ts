import type { SchedaAlunnoMateriale } from "@/types/scheda_alunno_materiale"
import type { SchedaAlunnoVoce } from "@/types/scheda_alunno_voce"

export type { PagedResponse, PageMeta } from "@/types/socio"

export interface PersonaInSchedaAlunno {
  id: number
  nome: string | null
  cognome: string | null
}

export interface IscrizioneCorsoInSchedaAlunno {
  id: number
  corso_id: number
  persona_id: number
}

export interface SchedaAlunno {
  id: number
  iscrizione_corso_id: number
  note: string | null
  aggiornato_da_persona_id: number | null
  iscrizione_corso: IscrizioneCorsoInSchedaAlunno
  aggiornato_da: PersonaInSchedaAlunno | null
  voci: SchedaAlunnoVoce[]
  materiali: SchedaAlunnoMateriale[]
}
