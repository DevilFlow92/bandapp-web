import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import {
  ANNO_TEST,
  createApiContext,
  creaAlunnoPuroDiTest,
  pulisciAlunnoPuroDiTest,
  creaLezioneEPresenzaDiTest,
  pulisciLezioneEPresenzaDiTest,
  creaSchedaAlunnoDiTest,
  pulisciSchedaAlunnoDiTest,
  type AlunnoPuroDiTest,
  type LezioneEPresenzaDiTest,
} from "./helpers"

/**
 * Card #22b/#22c/#22d/#22e — portale alunno: rotta /portale, riuso di
 * login/selezione banda, vista "Le mie iscrizioni" + calendario
 * lezioni/presenze + programma (scheda alunno) + pagamenti, e guardia sulla
 * rotta index "/" per gli alunni puri (nessun permesso, nessun superuser).
 *
 * Pagamenti (card #22e): il solo scenario "nessun pagamento" è coperto qui.
 * Uno scenario con pagamento reale richiederebbe creare un PagamentoCorso via
 * POST /pagamenti-corso/, che in locale fallisce con 422 "Configurazione
 * contabile mancante: imposta una voce per le rette corsi nella
 * configurazione anno 2999" — quella configurazione tocca contabilità reale
 * e non va creata al volo come effetto collaterale di un test e2e.
 */

test.describe.configure({ mode: "serial" })

let api: APIRequestContext
let datiTest: AlunnoPuroDiTest
let datiLezione: LezioneEPresenzaDiTest

test.beforeAll(async () => {
  api = await createApiContext()
  datiTest = await creaAlunnoPuroDiTest(api)
  datiLezione = await creaLezioneEPresenzaDiTest(api, datiTest.corso.id, datiTest.persona.id)
})

test.afterAll(async () => {
  await pulisciLezioneEPresenzaDiTest(api, datiLezione)
  await pulisciAlunnoPuroDiTest(api, datiTest)
  await api.dispose()
})

async function loginComeAlunnoPuro(page: Page) {
  await page.goto("/login")
  await page.locator("#email").fill(datiTest.utente.email)
  await page.locator("#password").fill(datiTest.utente.password)
  await page.getByRole("button", { name: "Accedi" }).click()

  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15_000 })
  if (page.url().includes("/banda")) {
    await page.getByRole("button").first().click()
  }
  await page.waitForURL((url) => url.pathname === "/portale", { timeout: 15_000 })
}

test("un alunno puro atterra su /portale e vede le proprie iscrizioni", async ({ page }) => {
  await loginComeAlunnoPuro(page)

  await expect(page.getByRole("heading", { name: "Le mie iscrizioni" })).toBeVisible()
  const riga = page.getByRole("row", { name: new RegExp(String(ANNO_TEST)) })
  await expect(riga).toBeVisible()
  await expect(riga.getByText("Richiesta")).toBeVisible()
})

test("un alunno puro apre il calendario lezioni e vede la propria presenza", async ({ page }) => {
  await loginComeAlunnoPuro(page)

  const riga = page.getByRole("row", { name: new RegExp(String(ANNO_TEST)) })
  await riga.getByRole("button", { name: "Vedi calendario" }).click()

  await page.waitForURL((url) => /\/portale\/iscrizioni\/\d+\/lezioni$/.test(url.pathname), {
    timeout: 15_000,
  })
  await expect(page.getByRole("heading", { name: "Calendario lezioni" })).toBeVisible()

  const rigaLezione = page.getByRole("row", { name: "e2e calendario lezioni" })
  await expect(rigaLezione).toBeVisible()
  await expect(rigaLezione.getByText("Presente")).toBeVisible()
})

test("un alunno puro apre il programma prima che sia condiviso e vede il messaggio informativo", async ({
  page,
}) => {
  await loginComeAlunnoPuro(page)

  const riga = page.getByRole("row", { name: new RegExp(String(ANNO_TEST)) })
  await riga.getByRole("button", { name: "Vedi programma" }).click()

  await page.waitForURL((url) => /\/portale\/iscrizioni\/\d+\/programma$/.test(url.pathname), {
    timeout: 15_000,
  })
  await expect(page.getByRole("heading", { name: "Programma" })).toBeVisible()
  await expect(
    page.getByText("Il programma non è stato ancora condiviso dall'insegnante."),
  ).toBeVisible()
})

test("un alunno puro apre il programma dopo che è stato condiviso e vede programma e note", async ({
  page,
}) => {
  const datiScheda = await creaSchedaAlunnoDiTest(api, datiTest.iscrizione.id)
  try {
    await loginComeAlunnoPuro(page)

    const riga = page.getByRole("row", { name: new RegExp(String(ANNO_TEST)) })
    await riga.getByRole("button", { name: "Vedi programma" }).click()

    await page.waitForURL((url) => /\/portale\/iscrizioni\/\d+\/programma$/.test(url.pathname), {
      timeout: 15_000,
    })
    await expect(page.getByRole("heading", { name: "Programma" })).toBeVisible()
    await expect(page.getByText("e2e programma di test")).toBeVisible()
    await expect(page.getByText("e2e note scheda alunno")).toBeVisible()
  } finally {
    await pulisciSchedaAlunnoDiTest(api, datiScheda)
  }
})

test("un alunno puro apre i pagamenti e vede il messaggio nessun pagamento registrato", async ({
  page,
}) => {
  await loginComeAlunnoPuro(page)

  const riga = page.getByRole("row", { name: new RegExp(String(ANNO_TEST)) })
  await riga.getByRole("button", { name: "Vedi pagamenti" }).click()

  await page.waitForURL((url) => /\/portale\/iscrizioni\/\d+\/pagamenti$/.test(url.pathname), {
    timeout: 15_000,
  })
  await expect(page.getByRole("heading", { name: "Pagamenti" })).toBeVisible()
  await expect(page.getByText("Nessun pagamento registrato al momento")).toBeVisible()
})

test("un alunno puro che tenta / vede la modale e viene rediretto a /portale", async ({ page }) => {
  await loginComeAlunnoPuro(page)

  await page.goto("/")
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("Non sei abilitato ad accedere al gestionale")).toBeVisible()

  await dialog.getByRole("button", { name: "OK" }).click()
  await page.waitForURL((url) => url.pathname === "/portale", { timeout: 15_000 })
})
