import type { VoceProgrammaCatalogo } from "@/types/voce_programma_catalogo"

export type StatoVoceProgramma = "da_iniziare" | "in_corso" | "acquisita"

export interface SchedaAlunnoVoce {
  id: number
  scheda_alunno_id: number
  voce_catalogo_id: number
  stato: StatoVoceProgramma
  dettaglio: string | null
  ordine: number
  voce_catalogo: VoceProgrammaCatalogo
}
