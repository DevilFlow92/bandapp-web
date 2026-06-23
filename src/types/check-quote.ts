export type StatoQuota = "OK" | "PARZIALE" | "MANCANTE" | "SOVRAPPIU" | "NON_DOVUTA"

export interface CheckQuotaSocio {
  socio_id: number
  codice_socio: string
  nome: string | null
  cognome: string | null
  quota_attesa: string
  quota_versata: string
  differenza: string
  stato: StatoQuota
}

export interface CheckQuoteTotali {
  totale_atteso: string
  totale_versato: string
  totale_mancante: string
  soci_ok: number
  soci_parziale: number
  soci_mancante: number
  soci_sovrappiu: number
  soci_non_dovuta: number
}

export interface CheckQuoteResponse {
  banda_codice: number
  anno: number
  quota_annuale_attesa: string
  soci: CheckQuotaSocio[]
  totali: CheckQuoteTotali
}
