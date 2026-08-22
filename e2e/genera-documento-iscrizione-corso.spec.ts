import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import {
  ANNO_TEST,
  createApiContext,
  creaCorsoConIscrizioni,
  creaTemplateDiTest,
  getDocumentoIdIscrizioneCorso,
  getTestUser,
  pulisciCorsoDiTest,
  pulisciDocumentoDiTest,
  pulisciTemplateDiTest,
  type CorsoDiTest,
  type TemplateDiTest,
} from "./helpers"

/**
 * CR #206b — generazione documento da template dentro
 * IscrizioneCorsoFormDialog (edit mode), via GeneraDocumentoIscrizioneCorso.
 * Copre il flusso end-to-end: selezione template, entità banda/iscrizione_corso
 * risolte automaticamente (read-only), generazione .docx e collegamento
 * all'iscrizione tramite useCollegaDocumentoAIscrizioneCorso.
 */

test.describe.configure({ mode: "serial" })

const NOME_TEMPLATE_TEST = "E2E Modulo Iscrizione Corso"

let api: APIRequestContext
let datiTest: CorsoDiTest
let template: TemplateDiTest
let documentoGeneratoId: number | null = null

test.beforeAll(async () => {
  api = await createApiContext()
  datiTest = await creaCorsoConIscrizioni(api, 1)
  template = await creaTemplateDiTest(api, NOME_TEMPLATE_TEST, [
    "banda.descrizione",
    "iscrizione_corso.tipo_corso",
  ])
})

test.afterAll(async () => {
  const iscrizioneId = datiTest.iscrizioni[0].id
  documentoGeneratoId = await getDocumentoIdIscrizioneCorso(api, iscrizioneId).catch(() => null)
  await pulisciTemplateDiTest(api, template)
  // L'iscrizione va eliminata prima del documento: finché la referenzia
  // tramite documento_id, il vincolo FK impedisce di cancellarlo.
  await pulisciCorsoDiTest(api, datiTest)
  await pulisciDocumentoDiTest(api, documentoGeneratoId)
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

  const tabellaIscritti = page.locator("table").filter({ hasText: "Stato iscrizione" }).last()
  const rigaIscrizione = tabellaIscritti.getByRole("row", { name: new RegExp(personaNome) })
  await expect(rigaIscrizione).toBeVisible()
  await rigaIscrizione.getByRole("button", { name: "Modifica" }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  return dialog
}

test("genera un documento da template e lo collega all'iscrizione corso", async ({ page }) => {
  await login(page)
  const iscrizione = datiTest.iscrizioni[0]
  const dialog = await apriDialogModificaIscrizione(page, iscrizione.personaNome)

  const moduloFieldset = dialog.locator("fieldset", { hasText: "Modulo di richiesta" })
  await expect(moduloFieldset).toBeVisible()

  await moduloFieldset.getByRole("button", { name: "Genera da modulo" }).click()

  // Nel DB può già esistere un template col nome di default ("Modulo
  // Iscrizione Corsi"), auto-selezionato: torniamo al picker per scegliere
  // esplicitamente il template di test. Attendiamo che l'UI si stabilizzi
  // su uno dei due stati possibili (picker già visibile, o un template
  // già auto-selezionato con "Cambia modulo") prima di decidere.
  const templateCombobox = moduloFieldset.getByRole("combobox")
  const cambiaModuloButton = moduloFieldset.getByRole("button", { name: "Cambia modulo" })
  await templateCombobox.or(cambiaModuloButton).first().waitFor({ state: "visible" })
  if (await cambiaModuloButton.isVisible()) {
    await cambiaModuloButton.click()
    await templateCombobox.waitFor({ state: "visible" })
  }

  await templateCombobox.click()
  await page.getByRole("option", { name: NOME_TEMPLATE_TEST }).click()

  await expect(moduloFieldset.getByText("Banda", { exact: true })).toBeVisible()
  await expect(moduloFieldset.getByText("Iscrizione Corso", { exact: true })).toBeVisible()

  const generaDocxButton = moduloFieldset.getByRole("button", { name: "Genera DOCX" })
  await expect(generaDocxButton).toBeEnabled({ timeout: 10_000 })
  await generaDocxButton.click()

  await expect(page.getByText("Documento generato").first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText("Documento collegato all'iscrizione.").first()).toBeVisible()

  // onDocumentoCollegato chiude il dialog: verifichiamo lato API che il
  // documento sia stato effettivamente collegato all'iscrizione.
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })

  await expect
    .poll(async () => getDocumentoIdIscrizioneCorso(api, iscrizione.id), { timeout: 10_000 })
    .not.toBeNull()
})
