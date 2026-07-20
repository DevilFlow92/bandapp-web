export type { PagedResponse, PageMeta } from "@/types/socio"

export type StatoPresenza = "PRESENTE" | "ASSENTE" | "GIUSTIFICATO"

export interface PersonaInPresenza {
  id: number
  nome: string | null
  cognome: string | null
  ragione_sociale: string | null
}

export interface Presenza {
  id: number
  persona_id: number
  servizio_id: number | null
  stato: StatoPresenza | null
  note: string | null
  persona?: PersonaInPresenza | null
}
