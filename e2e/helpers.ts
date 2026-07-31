import { type APIRequestContext, request as playwrightRequest } from "@playwright/test"
import { API_URL } from "../playwright.config"

export interface TestUser {
  email: string
  password: string
}

/** Credenziali lette da env: E2E_EMAIL / E2E_PASSWORD (mai committate). */
export function getTestUser(): TestUser {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  if (!email || !password) {
    throw new Error(
      "Imposta le variabili d'ambiente E2E_EMAIL e E2E_PASSWORD per eseguire i test e2e.",
    )
  }
  return { email, password }
}

/** Contesto per chiamate API dirette (setup/cleanup dei dati), autenticato via cookie di sessione. */
export async function createApiContext(): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL: API_URL })
  const { email, password } = getTestUser()
  const res = await context.post("auth/login", { data: { email, password } })
  if (!res.ok()) {
    throw new Error(`Login API fallito: ${res.status()} ${await res.text()}`)
  }
  return context
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Anno sentinella per riconoscere in UI il corso creato dal test senza collidere con dati reali. */
export const ANNO_TEST = 2999

interface SocioMinimo {
  persona_id: number
  persona: { nome: string; cognome: string }
}

export interface CorsoDiTest {
  corso: { id: number }
  iscrizioni: Array<{ id: number; personaNome: string }>
}

/** Crea un corso e n iscrizioni (una per ciascun socio esistente diverso dall'utente loggato). */
export async function creaCorsoConIscrizioni(
  api: APIRequestContext,
  numeroIscrizioni: number,
): Promise<CorsoDiTest> {
  const bandaRes = await api.get("bande/")
  const banda = (await bandaRes.json()).items[0]

  const sociRes = await api.get("soci/", {
    params: { banda_codice: String(banda.codice), page_size: "20" },
  })
  const soci: SocioMinimo[] = (await sociRes.json()).items
  const candidati = soci.filter((s) => s.persona.cognome !== "Fiori")
  if (candidati.length < numeroIscrizioni) {
    throw new Error("Non ci sono abbastanza soci di test nel DB locale per creare le iscrizioni.")
  }

  const corsoRes = await api.post("corsi/", {
    data: {
      banda_codice: banda.codice,
      tipo_corso_codice: 1,
      anno: ANNO_TEST,
      note: "e2e scheda-alunno",
    },
  })
  if (!corsoRes.ok()) throw new Error(`Creazione corso fallita: ${await corsoRes.text()}`)
  const corso = await corsoRes.json()

  const iscrizioni = []
  for (let i = 0; i < numeroIscrizioni; i++) {
    const socio = candidati[i]
    const iscrizioneRes = await api.post("iscrizioni-corso/", {
      data: {
        corso_id: corso.id,
        persona_id: socio.persona_id,
        stato_iscrizione_corso_codice: 1,
        data_iscrizione: today(),
      },
    })
    if (!iscrizioneRes.ok()) {
      throw new Error(`Creazione iscrizione fallita: ${await iscrizioneRes.text()}`)
    }
    const iscrizione = await iscrizioneRes.json()
    iscrizioni.push({
      id: iscrizione.id,
      personaNome: `${socio.persona.nome} ${socio.persona.cognome}`,
    })
  }

  return { corso, iscrizioni }
}

/** Elimina in ordine scheda alunno -> iscrizioni -> corso per non lasciare dati di test nel DB. */
export async function pulisciCorsoDiTest(api: APIRequestContext, dati: CorsoDiTest) {
  for (const iscrizione of dati.iscrizioni) {
    const schedeRes = await api.get("schede-alunno/", {
      params: { iscrizione_corso_id: String(iscrizione.id) },
    })
    if (schedeRes.ok()) {
      const schede = (await schedeRes.json()).items ?? []
      for (const scheda of schede) {
        await api.delete(`schede-alunno/${scheda.id}`).catch(() => {})
      }
    }
    await api.delete(`iscrizioni-corso/${iscrizione.id}`).catch(() => {})
  }
  await api.delete(`corsi/${dati.corso.id}`).catch(() => {})
}
