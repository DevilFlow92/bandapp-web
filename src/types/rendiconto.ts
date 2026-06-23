export interface SottovoceRendicontoAggregato {
  codice: number
  descrizione: string
  totale: string
}

export interface VoceRendicontoAggregato {
  codice: number
  descrizione: string
  totale: string
  sottovoci: SottovoceRendicontoAggregato[]
}

export interface SezioneRendicontoAggregato {
  codice: number
  descrizione: string
  totale: string
  voci: VoceRendicontoAggregato[]
}

export interface RendicontoTotali {
  entrate: string
  uscite: string
  avanzo_disavanzo: string
  saldo_finale_cassa: string
  saldo_finale_banca: string
}

export interface RendicontoResponse {
  banda_codice: number
  anno: number
  chiuso: boolean
  saldo_iniziale_cassa: string
  saldo_iniziale_banca: string
  sezioni: SezioneRendicontoAggregato[]
  totali: RendicontoTotali
}

export interface RendicontoMensileItem {
  mese: number
  entrate: string
  uscite: string
}

export interface RendicontoMensileResponse {
  banda_codice: number
  anno: number
  mensile: RendicontoMensileItem[]
}
