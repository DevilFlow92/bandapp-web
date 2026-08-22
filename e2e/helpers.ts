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

export interface AlunnoPuroDiTest {
  persona: { id: number }
  corso: { id: number }
  iscrizione: { id: number }
  utente: { id: number; email: string; password: string }
}

/**
 * Crea persona + corso + iscrizione + utente "alunno puro" (superuser=false,
 * zero ruoli/permessi) per i test end-to-end del portale alunno (card #22b).
 */
export async function creaAlunnoPuroDiTest(api: APIRequestContext): Promise<AlunnoPuroDiTest> {
  const bandaRes = await api.get("bande/")
  const banda = (await bandaRes.json()).items[0]

  const personaRes = await api.post("persone/", {
    data: { banda_codice: banda.codice, nome: "E2E", cognome: "PortaleAlunno" },
  })
  if (!personaRes.ok()) throw new Error(`Creazione persona fallita: ${await personaRes.text()}`)
  const persona = await personaRes.json()

  const corsoRes = await api.post("corsi/", {
    data: {
      banda_codice: banda.codice,
      tipo_corso_codice: 1,
      anno: ANNO_TEST,
      note: "e2e portale alunno",
    },
  })
  if (!corsoRes.ok()) throw new Error(`Creazione corso fallita: ${await corsoRes.text()}`)
  const corso = await corsoRes.json()

  const iscrizioneRes = await api.post("iscrizioni-corso/", {
    data: {
      corso_id: corso.id,
      persona_id: persona.id,
      stato_iscrizione_corso_codice: 1,
      data_iscrizione: today(),
    },
  })
  if (!iscrizioneRes.ok()) {
    throw new Error(`Creazione iscrizione fallita: ${await iscrizioneRes.text()}`)
  }
  const iscrizione = await iscrizioneRes.json()

  const email = `e2e-alunno-puro-${Date.now()}@example.com`
  const password = "AlunnoPuroTest2999!"
  const utenteRes = await api.post("utenti/", {
    data: {
      email,
      nome_completo: "E2E Portale Alunno",
      persona_id: persona.id,
      tipo: "umano",
      password,
      superuser: false,
      ruoli: [],
    },
  })
  if (!utenteRes.ok()) throw new Error(`Creazione utente fallita: ${await utenteRes.text()}`)
  const utente = await utenteRes.json()

  return { persona, corso, iscrizione, utente: { id: utente.id, email, password } }
}

/** Elimina in ordine utente -> iscrizione -> corso -> persona per non lasciare dati di test nel DB. */
export async function pulisciAlunnoPuroDiTest(api: APIRequestContext, dati: AlunnoPuroDiTest) {
  await api.delete(`utenti/${dati.utente.id}`).catch(() => {})
  await api.delete(`iscrizioni-corso/${dati.iscrizione.id}`).catch(() => {})
  await api.delete(`corsi/${dati.corso.id}`).catch(() => {})
  await api.delete(`persone/${dati.persona.id}`).catch(() => {})
}

export interface LezioneEPresenzaDiTest {
  lezione: { id: number }
  presenza: { id: number }
}

/**
 * Crea una Lezione sul corso indicato e una Presenza collegata (stato
 * PRESENTE) per la persona indicata, per verificare end-to-end il join
 * client-side lezioni/presenze del calendario portale alunno (card #22c).
 */
export async function creaLezioneEPresenzaDiTest(
  api: APIRequestContext,
  corsoId: number,
  personaId: number,
): Promise<LezioneEPresenzaDiTest> {
  const lezioneRes = await api.post("lezioni/", {
    data: { corso_id: corsoId, data_lezione: today(), note: "e2e calendario lezioni" },
  })
  if (!lezioneRes.ok()) throw new Error(`Creazione lezione fallita: ${await lezioneRes.text()}`)
  const lezione = await lezioneRes.json()

  const presenzaRes = await api.post("presenze/", {
    data: { lezione_id: lezione.id, persona_id: personaId },
  })
  if (!presenzaRes.ok()) {
    throw new Error(`Creazione presenza fallita: ${await presenzaRes.text()}`)
  }
  const presenza = await presenzaRes.json()

  const updateRes = await api.patch(`presenze/${presenza.id}`, { data: { stato: "PRESENTE" } })
  if (!updateRes.ok()) {
    throw new Error(`Aggiornamento stato presenza fallito: ${await updateRes.text()}`)
  }

  return { lezione: { id: lezione.id }, presenza: { id: presenza.id } }
}

/** Elimina in ordine presenza -> lezione per non lasciare dati di test nel DB. */
export async function pulisciLezioneEPresenzaDiTest(
  api: APIRequestContext,
  dati: LezioneEPresenzaDiTest,
) {
  await api.delete(`presenze/${dati.presenza.id}`).catch(() => {})
  await api.delete(`lezioni/${dati.lezione.id}`).catch(() => {})
}
