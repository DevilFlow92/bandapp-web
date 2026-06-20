export type { PagedResponse, PageMeta } from "@/types/socio"

export interface Permesso {
  codice: string
  descrizione: string
}

export interface Ruolo {
  id: number
  nome: string
  descrizione: string | null
  banda_codice: number | null
  permessi: Permesso[]
}

export interface Utente {
  id: number
  email: string
  nome_completo: string | null
  tipo: "umano" | "servizio"
  attivo: boolean
  superuser: boolean
  creato_il: string
  ruoli: Ruolo[]
}
