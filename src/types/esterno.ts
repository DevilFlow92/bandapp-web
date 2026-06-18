import type { Persona } from "@/types/socio"

export type { Persona, PagedResponse, PageMeta } from "@/types/socio"

export interface Esterno {
  id: number
  codice_esterno: string
  specializzazione: string | null
  tariffa_oraria: number | null
  attivo: boolean
  persona_id: number
  persona: Persona
}
