import type { CorsoInIscrizioneCorso } from "@/types/iscrizione_corso"

export interface RiepilogoVociPercorsoFormativo {
  totale: number
  da_iniziare: number
  in_corso: number
  acquisita: number
}

/** Una tappa del percorso formativo pluriennale: una iscrizione a corso della persona, con il riepilogo della sua scheda alunno se già creata dall'insegnante. */
export interface TappaPercorsoFormativo {
  iscrizione_corso_id: number
  corso: CorsoInIscrizioneCorso
  scheda_alunno_id: number | null
  riepilogo_voci: RiepilogoVociPercorsoFormativo
}
