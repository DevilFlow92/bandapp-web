export type { PagedResponse, PageMeta } from "@/types/socio"

export type TipoFlusso =
  | "MOVIMENTO"
  | "SALDO_INIZIALE"
  | "TRASFERIMENTO_USCITA"
  | "TRASFERIMENTO_ENTRATA"
  | "AUTO_ISCRIZIONE"

interface RendicontoRefInFlusso {
  codice: number
  descrizione: string
}

export interface FlussoCassa {
  id: number
  banda_codice: number
  data_registrazione: string
  descrizione_operazione: string
  note: string | null
  importo: string
  segno: "+" | "-"
  natura_flusso_codice: number
  voce_contabilita_id: number
  tipo: TipoFlusso
  iscrizione_id: number | null
  trasferimento_id: string | null
  natura_flusso?: { codice: number; descrizione: string } | null
  voce_contabilita?: {
    id: number
    voce_contabilita: string
    sezione_rendiconto_codice: number
    sezione_rendiconto?: RendicontoRefInFlusso | null
    voce_rendiconto?: RendicontoRefInFlusso | null
    sottovoce_rendiconto?: RendicontoRefInFlusso | null
  } | null
}

export interface FlussoCassaCreate {
  voce_contabilita_id: number
  natura_flusso_codice: number
  data_registrazione: string
  descrizione_operazione: string
  note?: string | null
  importo: string
  segno: "+" | "-"
}

export type FlussoCassaUpdate = Partial<FlussoCassaCreate>

export interface TrasferimentoCreate {
  voce_contabilita_id: number
  natura_da_codice: number
  natura_a_codice: number
  importo: string
  data_registrazione: string
  descrizione_operazione: string
  note?: string | null
}

export interface NaturaFlusso {
  codice: number
  descrizione: string
}
