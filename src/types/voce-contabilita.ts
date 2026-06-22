export type { PagedResponse, PageMeta } from "@/types/socio"

export interface RendicontoRef {
  codice: number
  descrizione: string
}

export interface VoceContabilita {
  id: number
  banda_codice: number
  voce_contabilita: string
  sezione_rendiconto_codice: number
  voce_rendiconto_codice: number
  sottovoce_rendiconto_codice: number
  sezione_rendiconto?: RendicontoRef | null
  voce_rendiconto?: RendicontoRef | null
  sottovoce_rendiconto?: RendicontoRef | null
}
