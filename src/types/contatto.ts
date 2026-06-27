export interface Contatto {
  id: number
  persona_id: number
  ruolo_contatto_codice: number
  email: string | null
  telefono: string | null
}

export interface CreateContattoInput {
  persona_id: number
  ruolo_contatto_codice: number
  email?: string | null
  telefono?: string | null
}
