import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import {
  createApiContext,
  creaAlunnoPuroDiTest,
  pulisciAlunnoPuroDiTest,
  getTestUser,
  type AlunnoPuroDiTest,
} from "./helpers"

/**
 * Card #201 — pagina di gestione del catalogo voci programma (/corsi/catalogo-programma).
 * Copre: create/edit/toggle attiva-disattiva del golden path, il 409 su
 * testo duplicato per lo stesso tipo corso, e il gate di permesso `corsi:write`
 * (URL diretto bloccato per chi non ce l'ha).
 */

test.describe.configure({ mode: "serial" })

let api: APIRequestContext

test.beforeAll(async () => {
  api = await createApiContext()
})

test.afterAll(async () => {
  await api.dispose()
})

/**
 * Il catalogo di questo ambiente di test ha già molte voci per tipo corso
 * (>20 solo per "Ottoni"), e la lista non ha un filtro testo dedicato né un
 * ordinamento "più recenti prima": una voce appena creata può finire su una
 * pagina successiva alla prima. Scorre le pagine finché la riga cercata non
 * compare (o le pagine finiscono).
 */
async function trovaRiga(page: Page, regex: RegExp) {
  const riga = page.getByRole("row", { name: regex })
  for (let i = 0; i < 20; i++) {
    if ((await riga.count()) > 0) return riga
    const successiva = page.getByRole("button", { name: "Successiva" })
    if (await successiva.isDisabled()) break
    await successiva.click()
  }
  return riga
}

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

test("crea, modifica e disattiva una voce di catalogo; segnala il 409 su testo duplicato", async ({
  page,
}) => {
  await login(page)
  await page.getByRole("link", { name: "Catalogo programmi" }).click()
  await page.waitForURL((url) => url.pathname === "/corsi/catalogo-programma", {
    timeout: 15_000,
  })

  // Filtra su un tipo corso noto (usato ovunque negli altri test e2e come
  // sentinella) per tenere la lista risultante piccola: senza un filtro
  // testo dedicato in questa pagina, una nuova voce potrebbe finire su una
  // pagina successiva se il catalogo ha già molte voci di altri tipi corso.
  await page.getByLabel("Tipo corso", { exact: true }).click()
  await page.getByRole("option", { name: "Ottoni" }).click()

  const testo = `E2E catalogo ${Date.now()}`

  await page.getByRole("button", { name: "Nuova voce" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  await dialog.getByLabel("Tipo corso").click()
  await page.getByRole("option", { name: "Ottoni" }).click()
  await dialog.getByLabel("Categoria").click()
  await page.getByRole("option").first().click()
  await dialog.locator("#testo").fill(testo)
  await dialog.getByRole("button", { name: "Crea" }).click()

  await expect(page.getByText("Voce creata").first()).toBeVisible()
  const riga = await trovaRiga(page, new RegExp(testo))
  await expect(riga).toBeVisible()
  await expect(riga.getByRole("cell", { name: "Attiva", exact: true })).toBeVisible()

  // Tentativo di duplicato: stesso testo, stesso tipo corso -> 409.
  await page.getByRole("button", { name: "Nuova voce" }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByLabel("Tipo corso").click()
  await page.getByRole("option", { name: "Ottoni" }).click()
  await dialog.getByLabel("Categoria").click()
  await page.getByRole("option").first().click()
  await dialog.locator("#testo").fill(testo)
  await dialog.getByRole("button", { name: "Crea" }).click()
  await expect(
    dialog.getByText("Esiste già una voce con questo testo per questo tipo corso."),
  ).toBeVisible()
  await dialog.getByRole("button", { name: "Annulla" }).click()

  // Modifica: cambia il testo.
  await riga.getByRole("button", { name: "Modifica" }).click()
  await expect(dialog).toBeVisible()
  const testoModificato = `${testo} modificata`
  await dialog.locator("#testo").fill(testoModificato)
  await dialog.getByRole("button", { name: "Salva" }).click()
  await expect(page.getByText("Voce aggiornata").first()).toBeVisible()

  const rigaModificata = await trovaRiga(page, new RegExp(testoModificato))
  await expect(rigaModificata).toBeVisible()

  // Disattiva: il filtro di default mostra solo le voci attive, quindi la
  // riga sparisce dalla vista corrente non appena il toggle ha successo.
  await rigaModificata.getByRole("button", { name: "Disattiva" }).click()
  await page.getByRole("button", { name: "Disattiva" }).last().click()
  await expect(page.getByText("Voce disattivata").first()).toBeVisible()
  await expect(rigaModificata).toHaveCount(0)

  // Passa al filtro "Tutte" per verificare che la voce sia effettivamente
  // disattivata (soft-delete: nessuna DELETE fisica lato backend).
  await page.getByLabel("Stato", { exact: true }).click()
  await page.getByRole("option", { name: "Tutte" }).click()
  const rigaDisattivata = await trovaRiga(page, new RegExp(testoModificato))
  await expect(
    rigaDisattivata.getByRole("cell", { name: "Disattivata", exact: true }),
  ).toBeVisible()
})

test.describe("gate di permesso corsi:write", () => {
  let datiAlunno: AlunnoPuroDiTest

  test.beforeAll(async () => {
    datiAlunno = await creaAlunnoPuroDiTest(api)
  })

  test.afterAll(async () => {
    await pulisciAlunnoPuroDiTest(api, datiAlunno)
  })

  test("un utente senza corsi:write non può aprire /corsi/catalogo-programma", async ({ page }) => {
    await page.goto("/login")
    await page.locator("#email").fill(datiAlunno.utente.email)
    await page.locator("#password").fill(datiAlunno.utente.password)
    await page.getByRole("button", { name: "Accedi" }).click()
    await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15_000 })

    await page.goto("/corsi/catalogo-programma")
    await expect(page.getByRole("heading", { name: "Catalogo programmi" })).toHaveCount(0)
  })
})
