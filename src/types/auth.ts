export interface Ruolo {
  id: number
  nome: string
}

export interface User {
  id: number
  email: string
  nome_completo: string
  tipo: string
  attivo: boolean
  superuser: boolean
  permessi: string[]
  ruoli: Ruolo[]
}

export interface LoginRequest {
  email: string
  password: string
}
