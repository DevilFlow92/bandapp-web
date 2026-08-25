import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import {
  ANNO_TEST,
  createApiContext,
  creaAllievoDiTest,
  pulisciAllievoDiTest,
  creaTappaPercorsoFormativoDiTest,
  pulisciTappaPercorsoFormativoDiTest,
  creaSchedaAlunnoDiTest,
  pulisciSchedaAlunnoDiTest,
  creaVoceCatalogoDiTest,
  pulisciVoceCatalogoDiTest,
  getPrimaCategoriaVoceProgramma,
  creaVoceSchedaAlunnoDiTest,
  getTestUser,
  type AllievoDiTest,
  type TappaPercorsoFormativoDiTest,
  type SchedaAlunnoDiTest,
  type VoceCatalogoDiTest,
} from "./helpers"

/**
 * Card #209 — pagina di dettaglio Allievo con il percorso formativo
 * pluriennale, sola lettura: timeline delle iscrizioni a corso nel tempo,
 * con il riepilogo delle voci di ciascuna scheda alunno. Il dettaglio di
 * una tappa riusa `IscrizioneCorsoFormDialog` esistente invece di
 * duplicarne il contenuto.
 */

test.describe.configure({ mode: "serial" })

const TIPO_CORSO_OTTONI = 1

let api: APIRequestContext
let allievo: AllievoDiTest
let tappaRecente: TappaPercorsoFormativoDiTest // anno ANNO_TEST, con scheda alunno e voci
let tappaVecchia: TappaPercorsoFormativoDiTest // anno ANNO_TEST - 1, senza scheda alunno
let scheda: SchedaAlunnoDiTest
let voceAcquisita: VoceCatalogoDiTest
let voceInCorso: VoceCatalogoDiTest

test.beforeAll(async () => {
  api = await createApiContext()
  allievo = await creaAllievoDiTest(api)

  tappaRecente = await creaTappaPercorsoFormativoDiTest(
    api,
    allievo.persona.id,
    ANNO_TEST,
    TIPO_CORSO_OTTONI,
  )
  tappaVecchia = await creaTappaPercorsoFormativoDiTest(
    api,
    allievo.persona.id,
    ANNO_TEST - 1,
    TIPO_CORSO_OTTONI,
  )

  scheda = await creaSchedaAlunnoDiTest(api, tappaRecente.iscrizione.id)
  const categoriaCodice = await getPrimaCategoriaVoceProgramma(api)
  voceAcquisita = await creaVoceCatalogoDiTest(api, TIPO_CORSO_OTTONI, categoriaCodice)
  voceInCorso = await creaVoceCatalogoDiTest(api, TIPO_CORSO_OTTONI, categoriaCodice)
  const voce1 = await creaVoceSchedaAlunnoDiTest(api, scheda.schedaAlunno.id, voceAcquisita.id)
  const voce2 = await creaVoceSchedaAlunnoDiTest(api, scheda.schedaAlunno.id, voceInCorso.id)

  const patch1 = await api.patch(`schede-alunno/${scheda.schedaAlunno.id}/voci/${voce1.id}`, {
    data: { stato: "acquisita" },
  })
  if (!patch1.ok()) throw new Error(`Aggiornamento stato voce fallito: ${await patch1.text()}`)
  const patch2 = await api.patch(`schede-alunno/${scheda.schedaAlunno.id}/voci/${voce2.id}`, {
    data: { stato: "in_corso" },
  })
  if (!patch2.ok()) throw new Error(`Aggiornamento stato voce fallito: ${await patch2.text()}`)
})

test.afterAll(async () => {
  await pulisciSchedaAlunnoDiTest(api, scheda)
  await pulisciVoceCatalogoDiTest(api, voceAcquisita)
  await pulisciVoceCatalogoDiTest(api, voceInCorso)
  await pulisciTappaPercorsoFormativoDiTest(api, tappaRecente)
  await pulisciTappaPercorsoFormativoDiTest(api, tappaVecchia)
  await pulisciAllievoDiTest(api, allievo)
  await api.dispose()
})

async function login(page: Page) {
  const { email, password } = getTestUser()
  await page.goto("/login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Accedi" }).click()

  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15_000 })
  if (page.url().includes("/banda")) {
    await page.getByRole("button").first().click()
    await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 })
  }
}

test("dalla lista allievi si apre il dettaglio con il percorso formativo pluriennale", async ({
  page,
}) => {
  await login(page)

  await page.getByRole("link", { name: "Allievi" }).click()
  await page.waitForURL((url) => url.pathname === "/allievi", { timeout: 15_000 })

  const riga = page.getByRole("row", { name: new RegExp(allievo.allievo.codice_allievo) })
  await expect(riga).toBeVisible()
  await riga.locator("td").first().click()
  await page.waitForURL((url) => /\/allievi\/\d+$/.test(url.pathname), { timeout: 15_000 })

  await expect(page.getByText("E2E PercorsoFormativo")).toBeVisible()
  await expect(page.getByText("Percorso formativo")).toBeVisible()

  const cardPercorso = page.locator("div.rounded-xl.border", { hasText: "Percorso formativo" })
  const tappe = cardPercorso.locator("li")
  await expect(tappe).toHaveCount(2)

  // Ordinate per anno decrescente: la tappa più recente (con scheda) prima.
  await expect(tappe.nth(0)).toContainText(String(ANNO_TEST))
  await expect(tappe.nth(0)).toContainText("1/2 voci acquisite")
  await expect(tappe.nth(0)).toContainText("1 in corso")
  await expect(tappe.nth(1)).toContainText(String(ANNO_TEST - 1))
  await expect(tappe.nth(1)).toContainText("Scheda non ancora creata")

  // Cliccare la tappa con scheda riusa IscrizioneCorsoFormDialog esistente
  // (stessa vista usata dal pannello iscritti del corso).
  await tappe.nth(0).getByRole("button").click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("Modifica iscrizione")).toBeVisible()
  await expect(dialog.getByText("Voci di programma")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible()

  // Una tappa senza scheda alunno non va omessa né mostra un riepilogo
  // fuorviante, ma resta cliccabile: il dialog si apre comunque, con
  // l'azione per creare la scheda.
  await tappe.nth(1).getByRole("button").click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Crea scheda alunno" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible()
})

test("un allievo senza iscrizioni a corsi mostra lo stato vuoto del percorso formativo", async ({
  page,
}) => {
  const allievoVuoto = await creaAllievoDiTest(api)
  try {
    await login(page)

    await page.getByRole("link", { name: "Allievi" }).click()
    await page.waitForURL((url) => url.pathname === "/allievi", { timeout: 15_000 })

    const riga = page.getByRole("row", { name: new RegExp(allievoVuoto.allievo.codice_allievo) })
    await riga.locator("td").first().click()
    await page.waitForURL((url) => /\/allievi\/\d+$/.test(url.pathname), { timeout: 15_000 })

    await expect(page.getByText("Nessuna iscrizione a corsi registrata")).toBeVisible()
  } finally {
    await pulisciAllievoDiTest(api, allievoVuoto)
  }
})
