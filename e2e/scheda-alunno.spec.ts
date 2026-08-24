import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import {
  ANNO_TEST,
  createApiContext,
  creaCorsoConIscrizioni,
  creaVoceCatalogoDiTest,
  getPrimaCategoriaVoceProgramma,
  getTestUser,
  pulisciCorsoDiTest,
  pulisciVoceCatalogoDiTest,
  type CorsoDiTest,
  type VoceCatalogoDiTest,
} from "./helpers"

/**
 * Card #21 / #201 — editor scheda alunno dentro IscrizioneCorsoFormDialog.
 * Copre: creazione scheda (note), il conflitto 409 in caso di doppio submit
 * concorrente sulla scheda, e l'editor delle voci di programma (aggiunta,
 * cambio stato, riordino, rimozione).
 */

test.describe.configure({ mode: "serial" })

let api: APIRequestContext
let datiTest: CorsoDiTest
let voceCatalogoA: VoceCatalogoDiTest
let voceCatalogoB: VoceCatalogoDiTest

test.beforeAll(async () => {
  api = await createApiContext()
  datiTest = await creaCorsoConIscrizioni(api, 2)
  const categoriaCodice = await getPrimaCategoriaVoceProgramma(api)
  voceCatalogoA = await creaVoceCatalogoDiTest(api, 1, categoriaCodice)
  voceCatalogoB = await creaVoceCatalogoDiTest(api, 1, categoriaCodice)
})

test.afterAll(async () => {
  await pulisciCorsoDiTest(api, datiTest)
  await pulisciVoceCatalogoDiTest(api, voceCatalogoA)
  await pulisciVoceCatalogoDiTest(api, voceCatalogoB)
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

test("crea la scheda alunno e gestisce il 409 da doppio submit riallineando il form in modalità update", async ({
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
      note: "Nota concorrente",
    },
  })
  expect(createRes.ok()).toBeTruthy()

  await schedaFieldset.locator("#scheda_note").fill("Nota inserita dal form")
  await creaButton.click()

  await expect(page.getByText("Scheda alunno già esistente").first()).toBeVisible()

  const salvaButton = schedaFieldset.getByRole("button", { name: "Salva scheda alunno" })
  await expect(salvaButton).toBeVisible()
  await expect(schedaFieldset.locator("#scheda_note")).toHaveValue("Nota concorrente")
})

test("aggiunge, riordina, cambia stato e rimuove voci di programma", async ({ page }) => {
  await login(page)
  const iscrizione = datiTest.iscrizioni[0]
  const dialog = await apriDialogModificaIscrizione(page, iscrizione.personaNome)

  const schedaFieldset = dialog.locator("fieldset", { hasText: "Scheda alunno" })
  const creaButton = schedaFieldset.getByRole("button", { name: "Crea scheda alunno" })
  await expect(creaButton).toBeVisible()
  await schedaFieldset.locator("#scheda_note").fill("Buoni progressi sul ritmo")
  await creaButton.click()
  await expect(page.getByText("Scheda alunno creata").first()).toBeVisible()

  // Il testo della voce compare sia nella riga renderizzata (<p class="font-medium">)
  // sia, transitoriamente, nel <select> nativo nascosto che Radix Select
  // affianca al proprio combobox: scoping a "p.font-medium" evita
  // ambiguità (getByText su schedaFieldset intera può matchare entrambi).
  const testoVoce = (testo: string) =>
    schedaFieldset.locator("p.font-medium").filter({ hasText: testo })

  // Aggiunge la prima voce.
  await schedaFieldset.getByRole("button", { name: "Aggiungi voce" }).click()
  await schedaFieldset.getByLabel("Voce di catalogo").click()
  await page.getByRole("option", { name: voceCatalogoA.testo }).click()
  await schedaFieldset.getByRole("button", { name: "Conferma" }).click()
  await expect(testoVoce(voceCatalogoA.testo)).toBeVisible()

  // Aggiunge la seconda voce (duplicati di catalogo ammessi, qui voce diversa).
  await schedaFieldset.getByRole("button", { name: "Aggiungi voce" }).click()
  await schedaFieldset.getByLabel("Voce di catalogo").click()
  await page.getByRole("option", { name: voceCatalogoB.testo }).click()
  await schedaFieldset.getByRole("button", { name: "Conferma" }).click()
  await expect(testoVoce(voceCatalogoB.testo)).toBeVisible()

  const rigaA = schedaFieldset
    .locator("div.rounded-md.border.p-3")
    .filter({ hasText: voceCatalogoA.testo })

  // Cambia lo stato della prima voce. Il trigger del Select è l'unico
  // elemento associato all'etichetta "Stato" (getByLabel via htmlFor su
  // #voce-{id}-stato): un getByText generico sulla riga matcherebbe anche
  // l'<option> nascosto che Radix Select affianca al trigger per
  // l'accessibilità nativa, causando una strict-mode violation.
  const statoTriggerA = rigaA.getByLabel("Stato")
  await statoTriggerA.click()
  await page.getByRole("option", { name: "In corso" }).click()
  await expect(statoTriggerA).toHaveText("In corso")

  // Riordina: sposta giù la prima voce (ora sotto la seconda).
  await rigaA.getByRole("button", { name: "Sposta giù" }).click()
  await expect(rigaA.getByRole("button", { name: "Sposta giù" })).toBeDisabled()

  // Rimuove la seconda voce (voceCatalogoB), ora in prima posizione.
  const rigaB = schedaFieldset
    .locator("div.rounded-md.border.p-3")
    .filter({ hasText: voceCatalogoB.testo })
  await rigaB.getByRole("button", { name: "Rimuovi" }).click()
  await page.getByRole("button", { name: "Rimuovi" }).last().click()
  await expect(testoVoce(voceCatalogoB.testo)).toHaveCount(0)
  await expect(testoVoce(voceCatalogoA.testo)).toBeVisible()
})
