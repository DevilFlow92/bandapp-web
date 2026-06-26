export type { PagedResponse, PageMeta } from "@/types/socio"

export interface VoceContabilitaInConfig {
  id: number
  voce_contabilita: string
  sezione_rendiconto_codice: number
}

export interface UtenteInConfig {
  id: number
  email: string
}

export interface ConfigurazioneBandaAnno {
  id: number
  banda_codice: number
  anno: number
  quota_annuale_attesa: string
  saldo_iniziale_cassa: string
  saldo_iniziale_banca: string
  voce_contabilita_quote_id: number | null
  chiuso: boolean
  data_chiusura: string | null
  chiuso_da_utente_id: number | null
  voce_contabilita_quote: VoceContabilitaInConfig | null
  chiuso_da_utente: UtenteInConfig | null
}
