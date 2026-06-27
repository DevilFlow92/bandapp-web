export interface ComuneNested {
  codice: number
  descrizione: string
}

export interface Indirizzo {
  id: number
  tipo_indirizzo_codice: number
  prima_riga: string | null
  seconda_riga: string | null
  comune_codice: number | null
  comune: ComuneNested | null
  cap: string | null
  numero_civico: string | null
  interno: string | null
}

export interface CreateIndirizzoInput {
  tipo_indirizzo_codice: number
  prima_riga: string
  numero_civico?: string | null
  cap?: string | null
  comune_codice?: number | null
}
