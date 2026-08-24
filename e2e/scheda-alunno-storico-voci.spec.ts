import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import {
  ANNO_TEST,
  createApiContext,
  creaAlunnoPuroDiTest,
  pulisciAlunnoPuroDiTest,
  creaSchedaAlunnoDiTest,
  pulisciSchedaAlunnoDiTest,
  creaVoceCatalogoDiTest,
  pulisciVoceCatalogoDiTest,
  getPrimaCategoriaVoceProgramma,
  creaVoceSchedaAlunnoDiTest,
  getTestUser,
  type AlunnoPuroDiTest,
  type SchedaAlunnoDiTest,
  type VoceCatalogoDiTest,
} from "./helpers"

/**
 * Card #207 — storico dei cambi di stato delle voci di programma, sola
 * lettura in entrambe le superfici (dati raccolti da #214, esposti da #219).
 * Le transizioni sono generate via API (due PATCH successive sulla stessa
 * voce), il test verifica solo che `StoricoVociLog` le renda leggibili.
 */

test.describe.configure({ mode: "serial" })

let api: APIRequestContext
let datiTest: AlunnoPuroDiTest
let datiScheda: SchedaAlunnoDiTest
let voceCatalogo: VoceCatalogoDiTest
let voceSchedaId: number

test.beforeAll(async () => {
  api = await createApiContext()
  datiTest = await creaAlunnoPuroDiTest(api)
  datiScheda = await creaSchedaAlunnoDiTest(api, datiTest.iscrizione.id)
  const categoriaCodice = await getPrimaCategoriaVoceProgramma(api)
  voceCatalogo = await creaVoceCatalogoDiTest(api, 1, categoriaCodice)
  const voce = await creaVoceSchedaAlunnoDiTest(api, datiScheda.schedaAlunno.id, voceCatalogo.id)
  voceSchedaId = voce.id

  // Due transizioni di stato successive: da_iniziare -> in_corso -> acquisita.
  const primaRes = await api.patch(
    `schede-alunno/${datiScheda.schedaAlunno.id}/voci/${voceSchedaId}`,
    { data: { stato: "in_corso" } },
  )
  if (!primaRes.ok()) throw new Error(`Prima transizione fallita: ${await primaRes.text()}`)
  const secondaRes = await api.patch(
    `schede-alunno/${datiScheda.schedaAlunno.id}/voci/${voceSchedaId}`,
    { data: { stato: "acquisita" } },
  )
  if (!secondaRes.ok()) throw new Error(`Seconda transizione fallita: ${await secondaRes.text()}`)
})

test.afterAll(async () => {
  await pulisciSchedaAlunnoDiTest(api, datiScheda)
  await pulisciAlunnoPuroDiTest(api, datiTest)
  await pulisciVoceCatalogoDiTest(api, voceCatalogo)
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

test("il pannello insegnante mostra lo storico dei cambi di stato in sola lettura, più recente prima", async ({
  page,
}) => {
  await login(page)

  await page.getByRole("link", { name: "Corsi" }).click()
  await page.waitForURL((url) => url.pathname === "/corsi", { timeout: 15_000 })
  const rigaCorso = page.getByRole("row", { name: new RegExp(String(ANNO_TEST)) })
  await expect(rigaCorso).toBeVisible()
  await rigaCorso.getByRole("button", { name: "Espandi" }).click()

  const tabellaIscritti = page.locator("table").filter({ hasText: "Stato iscrizione" }).last()
  const rigaIscrizione = tabellaIscritti.getByRole("row", { name: /E2E PortaleAlunno/ })
  await expect(rigaIscrizione).toBeVisible()
  await rigaIscrizione.getByRole("button", { name: "Modifica" }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("Storico modifiche")).toBeVisible()

  const sezioneStorico = dialog.locator("div.space-y-2.border-t.pt-3", {
    hasText: "Storico modifiche",
  })
  const righeStorico = sezioneStorico.locator("div.rounded-md.border.p-3")
  // 3 righe: la creazione della voce (stato_precedente null) + le due
  // transizioni successive (da_iniziare -> in_corso -> acquisita).
  await expect(righeStorico).toHaveCount(3)

  // Più recente prima: la prima riga è la transizione in_corso -> acquisita.
  await expect(righeStorico.nth(0)).toContainText("In corso")
  await expect(righeStorico.nth(0)).toContainText("Acquisita")
  await expect(righeStorico.nth(1)).toContainText("Da iniziare")
  await expect(righeStorico.nth(1)).toContainText("In corso")
  await expect(righeStorico.nth(2)).toContainText("Da iniziare")

  // Nessun controllo di scrittura nella sezione storico: solo testo.
  await expect(righeStorico.getByRole("button")).toHaveCount(0)
})

test("il portale alunno mostra la propria cronologia del programma", async ({ page }) => {
  await page.goto("/login")
  await page.locator("#email").fill(datiTest.utente.email)
  await page.locator("#password").fill(datiTest.utente.password)
  await page.getByRole("button", { name: "Accedi" }).click()
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15_000 })
  if (page.url().includes("/banda")) {
    await page.getByRole("button").first().click()
  }
  await page.waitForURL((url) => url.pathname === "/portale", { timeout: 15_000 })

  const riga = page.getByRole("row", { name: new RegExp(String(ANNO_TEST)) })
  await riga.getByRole("button", { name: "Vedi programma" }).click()
  await page.waitForURL((url) => /\/portale\/iscrizioni\/\d+\/programma$/.test(url.pathname), {
    timeout: 15_000,
  })

  await expect(page.getByText("Cronologia programma")).toBeVisible()
  const cardStorico = page.locator("div.rounded-xl.border", { hasText: "Cronologia programma" })
  const righeStorico = cardStorico.locator("div.rounded-md.border.p-3")
  await expect(righeStorico).toHaveCount(3)
  await expect(righeStorico.nth(0)).toContainText("In corso")
  await expect(righeStorico.nth(0)).toContainText("Acquisita")
})
