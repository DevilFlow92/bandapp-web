export type { PagedResponse, PageMeta } from "@/types/socio"

import type { TipoRicevuta } from "@/types/ricevuta"

export interface RicevutaInPagamentoCorso {
  id: number
  data_ricevuta: string // ISO datetime
  importo: number
  tipo_ricevuta: TipoRicevuta | null
  persona_id: number | null
}

export interface PagamentoCorso {
  id: number
  iscrizione_corso_id: number
  data_pagamento: string // ISO date
  importo: number
  note: string | null
  ricevuta_id: number | null
  ricevuta?: RicevutaInPagamentoCorso | null
}
