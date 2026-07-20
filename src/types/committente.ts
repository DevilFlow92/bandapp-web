export type { PagedResponse, PageMeta } from "@/types/socio"

export interface Committente {
  id: number
  banda_codice: number
  denominazione: string
  indirizzo_id: number | null
  codice_fiscale_piva: string | null
  note: string | null
}
