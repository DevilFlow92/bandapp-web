import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
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

test("crea la scheda alunno e gestisce il 409 da doppio submit riallineando il form in modalità autosave", async ({
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

  // Dopo il 409 il refetch riallinea la UI in modalità update (rifinitura
  // #203): niente più pulsante "Salva scheda alunno", il campo note passa
  // ad autosave e mostra il valore ricaricato dal server.
  await expect(schedaFieldset.getByRole("button", { name: "Crea scheda alunno" })).toHaveCount(0)
  await expect(schedaFieldset.getByRole("button", { name: "Salva scheda alunno" })).toHaveCount(0)
  await expect(schedaFieldset.locator("#scheda_note")).toHaveValue("Nota concorrente")
})

test("autosalva le note della scheda alunno on-blur, senza pulsante esplicito", async ({
  page,
}) => {
  // Riusa la scheda creata dal test precedente sulla stessa iscrizione
  // (mode "serial", stesso DB).
  await login(page)
  const iscrizione = datiTest.iscrizioni[1]
  const dialog = await apriDialogModificaIscrizione(page, iscrizione.personaNome)
  const schedaFieldset = dialog.locator("fieldset", { hasText: "Scheda alunno" })

  const noteField = schedaFieldset.locator("#scheda_note")
  await expect(noteField).toHaveValue("Nota concorrente")
  await expect(schedaFieldset.getByRole("button", { name: "Salva scheda alunno" })).toHaveCount(0)

  await noteField.fill("Nota aggiornata via autosave")
  await noteField.blur()
  await expect(schedaFieldset.getByText("Salvato")).toBeVisible()

  // Blur senza modifiche: nessuna nuova PATCH, nessun indicatore di salvataggio.
  await noteField.focus()
  await noteField.blur()
  await expect(schedaFieldset.getByText("Salvataggio…")).toHaveCount(0)

  // Ricarica il dialog per confermare che la modifica sia persistita lato
  // server: la riga del corso è già espansa da apriDialogModificaIscrizione,
  // quindi riapriamo solo cliccando di nuovo "Modifica" (un secondo click
  // su "Espandi" la richiuderebbe invece di lasciarla aperta).
  await dialog.getByRole("button", { name: "Annulla" }).click()
  await expect(dialog).toHaveCount(0)
  const tabellaIscritti = page.locator("table").filter({ hasText: "Stato iscrizione" }).last()
  const rigaIscrizione = tabellaIscritti.getByRole("row", {
    name: new RegExp(iscrizione.personaNome),
  })
  await rigaIscrizione.getByRole("button", { name: "Modifica" }).click()
  const dialogRiaperto = page.getByRole("dialog")
  await expect(dialogRiaperto).toBeVisible()
  const schedaFieldsetRiaperto = dialogRiaperto.locator("fieldset", { hasText: "Scheda alunno" })
  await expect(schedaFieldsetRiaperto.locator("#scheda_note")).toHaveValue(
    "Nota aggiornata via autosave",
  )
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

  // Scoping alla sezione "Voci di programma" (non all'intero fieldset): da
  // #207 lo stesso fieldset contiene anche "Storico modifiche", che
  // renderizza il testo della voce con la stessa classe "p.font-medium" (le
  // righe di storico restano visibili anche dopo la rimozione della voce),
  // quindi un match sull'intero fieldset sarebbe ambiguo.
  const vociSection = schedaFieldset.locator("div.space-y-2.border-t.pt-3", {
    hasText: "Voci di programma",
  })
  const testoVoce = (testo: string) =>
    vociSection.locator("p.font-medium").filter({ hasText: testo })

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

  const rigaA = vociSection
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
  const rigaB = vociSection
    .locator("div.rounded-md.border.p-3")
    .filter({ hasText: voceCatalogoB.testo })
  await rigaB.getByRole("button", { name: "Rimuovi" }).click()
  await page.getByRole("button", { name: "Rimuovi" }).last().click()
  await expect(testoVoce(voceCatalogoB.testo)).toHaveCount(0)
  await expect(testoVoce(voceCatalogoA.testo)).toBeVisible()
})

test("carica un file, blocca un'estensione non ammessa, aggiunge un link, scarica e rimuove il materiale didattico", async ({
  page,
}) => {
  // Riusa la scheda alunno creata dal test precedente sulla stessa
  // iscrizione (mode "serial", stesso DB): evita di ricreare note/scheda
  // solo per testare la sezione materiali.
  await login(page)
  const iscrizione = datiTest.iscrizioni[0]
  const dialog = await apriDialogModificaIscrizione(page, iscrizione.personaNome)
  const schedaFieldset = dialog.locator("fieldset", { hasText: "Scheda alunno" })
  await expect(schedaFieldset.locator("#scheda_note")).toHaveValue("Buoni progressi sul ritmo")

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-materiali-"))
  const fileInput = schedaFieldset.locator('input[type="file"]')

  // Estensione non ammessa: bloccata lato client, nessuna chiamata al server.
  const fileNonAmmesso = path.join(tmpDir, "eseguibile.exe")
  fs.writeFileSync(fileNonAmmesso, "contenuto non rilevante")
  await fileInput.setInputFiles(fileNonAmmesso)
  await expect(schedaFieldset.getByText(/Estensione .* non ammessa/)).toBeVisible()

  // Upload di un file valido.
  const fileValido = path.join(tmpDir, "dispensa-e2e.pdf")
  fs.writeFileSync(fileValido, "%PDF-1.4 contenuto e2e")
  await fileInput.setInputFiles(fileValido)
  await schedaFieldset.locator("#materiale-file-titolo").fill("Dispensa E2E")
  await schedaFieldset.getByRole("button", { name: "Carica" }).click()
  const rigaFile = schedaFieldset
    .locator("div.flex.items-center.justify-between")
    .filter({ hasText: "Dispensa E2E" })
  await expect(rigaFile).toBeVisible({ timeout: 10_000 })
  await expect(rigaFile.getByText("File")).toBeVisible()

  // Aggiunta di un link.
  await schedaFieldset.getByRole("button", { name: "Aggiungi link" }).click()
  await schedaFieldset.locator("#materiale-link-titolo").fill("Video E2E")
  await schedaFieldset.locator("#materiale-link-url").fill("https://example.com/e2e-video")
  await schedaFieldset.getByRole("button", { name: "Conferma" }).click()
  const rigaLink = schedaFieldset
    .locator("div.flex.items-center.justify-between")
    .filter({ hasText: "Video E2E" })
  await expect(rigaLink).toBeVisible({ timeout: 10_000 })
  await expect(rigaLink.getByText("Link")).toBeVisible()

  // Download del file caricato.
  const downloadPromise = page.waitForEvent("download")
  await rigaFile.getByRole("button", { name: "Scarica" }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe("dispensa-e2e.pdf")

  // Rimozione del link e del file: la scheda non è eliminabile finché ha
  // materiali agganciati (stesso vincolo già noto per le voci), quindi il
  // cleanup in afterAll richiede che entrambi siano rimossi qui o là.
  await rigaLink.getByRole("button", { name: "Rimuovi" }).click()
  await page.getByRole("button", { name: "Rimuovi" }).last().click()
  await expect(schedaFieldset.getByText("Video E2E")).toHaveCount(0)

  await rigaFile.getByRole("button", { name: "Rimuovi" }).click()
  await page.getByRole("button", { name: "Rimuovi" }).last().click()
  await expect(schedaFieldset.getByText("Dispensa E2E")).toHaveCount(0)
  await expect(schedaFieldset.getByText("Nessun materiale didattico inserito.")).toBeVisible()
})
