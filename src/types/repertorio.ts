export type { PagedResponse, PageMeta } from "@/types/socio"

export interface NomeParteInRepertorioItem {
  id: number
  nome: string
}

export interface RepertorioItem {
  id: number
  nome_parte_id: number
  servizio_id: number | null
  ordine: number
  note: string | null
  nome_parte?: NomeParteInRepertorioItem | null
}
