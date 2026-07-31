import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import {
  ANNO_TEST,
  createApiContext,
  creaCorsoConIscrizioni,
  getTestUser,
  pulisciCorsoDiTest,
  type CorsoDiTest,
} from "./helpers"

/**
 * Card #21 — editor scheda alunno dentro IscrizioneCorsoFormDialog.
 * Copre: creazione, modifica e il conflitto 409 in caso di doppio submit
 * concorrente, verificando che il form si riallinei passando a "update".
 */

test.describe.configure({ mode: "serial" })

let api: APIRequestContext
let datiTest: CorsoDiTest

test.beforeAll(async () => {
  api = await createApiContext()
  datiTest = await creaCorsoConIscrizioni(api, 2)
})

test.afterAll(async () => {
  await pulisciCorsoDiTest(api, datiTest)
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

async function apriDialogModificaIscrizione(page: Page, personaNome: string) {
  await page.getByRole("link", { name: "Corsi" }).click()
  await page.waitForURL((url) => url.pathname === "/corsi", { timeout: 15_000 })
  const rigaCorso = page.getByRole("row", { name: new RegExp(String(ANNO_TEST)) })
  await expect(rigaCorso).toBeVisible()
  await rigaCorso.getByRole("button", { name: "Espandi" }).click()

  // Le tabelle sono annidate (corsi -> iscrizioni): .last() prende quella più interna.
  const tabellaIscritti = page.locator("table").filter({ hasText: "Stato iscrizione" }).last()
  const rigaIscrizione = tabellaIscritti.getByRole("row", { name: new RegExp(personaNome) })
  await expect(rigaIscrizione).toBeVisible()
  await rigaIscrizione.getByRole("button", { name: "Modifica" }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  return dialog
}

test("crea e poi modifica la scheda alunno di un'iscrizione", async ({ page }) => {
  await login(page)
  const iscrizione = datiTest.iscrizioni[0]
  const dialog = await apriDialogModificaIscrizione(page, iscrizione.personaNome)

  const schedaFieldset = dialog.locator("fieldset", { hasText: "Scheda alunno" })
  await expect(schedaFieldset).toBeVisible()

  const creaButton = schedaFieldset.getByRole("button", { name: "Crea scheda alunno" })
  await expect(creaButton).toBeVisible()

  await schedaFieldset.locator("#scheda_programma").fill("Scale maggiori e minori, studio n. 3")
  await schedaFieldset.locator("#scheda_note").fill("Buoni progressi sul ritmo")
  await creaButton.click()

  await expect(page.getByText("Scheda alunno creata").first()).toBeVisible()

  const salvaButton = schedaFieldset.getByRole("button", { name: "Salva scheda alunno" })
  await expect(salvaButton).toBeVisible()
  await expect(schedaFieldset.locator("#scheda_programma")).toHaveValue(
    "Scale maggiori e minori, studio n. 3",
  )

  await schedaFieldset.locator("#scheda_note").fill("Buoni progressi sul ritmo — aggiornato")
  await salvaButton.click()

  await expect(page.getByText("Scheda alunno aggiornata").first()).toBeVisible()
})

test("gestisce il 409 da doppio submit riallineando il form in modalità update", async ({
  page,
}) => {
  await login(page)
  const iscrizione = datiTest.iscrizioni[1]
  const dialog = await apriDialogModificaIscrizione(page, iscrizione.personaNome)

  const schedaFieldset = dialog.locator("fieldset", { hasText: "Scheda alunno" })
  const creaButton = schedaFieldset.getByRole("button", { name: "Crea scheda alunno" })
  await expect(creaButton).toBeVisible()

  // Simula una race condition: un'altra richiesta crea la scheda mentre il
  // form è già aperto e non ancora inviato.
  const createRes = await api.post("schede-alunno/", {
    data: {
      iscrizione_corso_id: iscrizione.id,
      programma: "Programma creato in concorrenza",
      note: "Nota concorrente",
    },
  })
  expect(createRes.ok()).toBeTruthy()

  await schedaFieldset.locator("#scheda_programma").fill("Programma inserito dal form")
  await creaButton.click()

  await expect(page.getByText("Scheda alunno già esistente").first()).toBeVisible()

  const salvaButton = schedaFieldset.getByRole("button", { name: "Salva scheda alunno" })
  await expect(salvaButton).toBeVisible()
  await expect(schedaFieldset.locator("#scheda_programma")).toHaveValue(
    "Programma creato in concorrenza",
  )
})
