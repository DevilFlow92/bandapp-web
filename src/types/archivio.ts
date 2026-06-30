export interface MacroSezione {
  codice: number
  nome: string
  permesso_prefisso: string
  ordine: number
}

export interface SottoCartella {
  id: number
  nome: string
  macro_sezione_codice: number
}
