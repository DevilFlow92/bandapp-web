import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import {
  ANNO_TEST,
  createApiContext,
  creaAlunnoPuroDiTest,
  pulisciAlunnoPuroDiTest,
  type AlunnoPuroDiTest,
} from "./helpers"

/**
 * Card #22b — portale alunno: rotta /portale, riuso di login/selezione banda,
 * vista "Le mie iscrizioni" e guardia sulla rotta index "/" per gli alunni puri
 * (nessun permesso, nessun superuser).
 */

test.describe.configure({ mode: "serial" })

let api: APIRequestContext
let datiTest: AlunnoPuroDiTest

test.beforeAll(async () => {
  api = await createApiContext()
  datiTest = await creaAlunnoPuroDiTest(api)
})

test.afterAll(async () => {
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

test("un alunno puro che tenta / vede la modale e viene rediretto a /portale", async ({ page }) => {
  await loginComeAlunnoPuro(page)

  await page.goto("/")
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("Non sei abilitato ad accedere al gestionale")).toBeVisible()

  await dialog.getByRole("button", { name: "OK" }).click()
  await page.waitForURL((url) => url.pathname === "/portale", { timeout: 15_000 })
})
