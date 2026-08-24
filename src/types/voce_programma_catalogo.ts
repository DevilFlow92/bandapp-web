export type { PagedResponse, PageMeta } from "@/types/socio"

export interface TipoCorsoInVoceProgramma {
  codice: number
  descrizione: string
}

export interface CategoriaInVoceProgramma {
  codice: number
  descrizione: string
}

export interface VoceProgrammaCatalogo {
  id: number
  tipo_corso_codice: number
  categoria_codice: number
  testo: string
  livello: number
  attiva: boolean
  tipo_corso: TipoCorsoInVoceProgramma
  categoria: CategoriaInVoceProgramma
}
