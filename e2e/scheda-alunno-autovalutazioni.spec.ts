import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import {
  ANNO_TEST,
  createApiContext,
  createApiContextComeUtente,
  creaAlunnoPuroDiTest,
  pulisciAlunnoPuroDiTest,
  creaSchedaAlunnoDiTest,
  pulisciSchedaAlunnoDiTest,
  getTestUser,
  type AlunnoPuroDiTest,
  type SchedaAlunnoDiTest,
} from "./helpers"

/**
 * Card #204 — diario di autovalutazione dell'alunno: PRIMA scrittura del
 * portale alunno lato frontend (finora sempre sola lettura). Copre il
 * componente condiviso `AutovalutazioniLog` in entrambe le superfici:
 * scrittura nel portale (aggiungi/modifica/elimina una propria nota) e sola
 * lettura nel pannello insegnante (`IscrizioneCorsoFormDialog`).
 */

test.describe.configure({ mode: "serial" })

let api: APIRequestContext
let datiTest: AlunnoPuroDiTest
let datiScheda: SchedaAlunnoDiTest

test.beforeAll(async () => {
  api = await createApiContext()
  datiTest = await creaAlunnoPuroDiTest(api)
  datiScheda = await creaSchedaAlunnoDiTest(api, datiTest.iscrizione.id)
})

test.afterAll(async () => {
  await pulisciSchedaAlunnoDiTest(api, datiScheda)
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

test("un alunno puro aggiunge, modifica ed elimina una propria nota di autovalutazione dal portale", async ({
  page,
}) => {
  await loginComeAlunnoPuro(page)

  const riga = page.getByRole("row", { name: new RegExp(String(ANNO_TEST)) })
  await riga.getByRole("button", { name: "Vedi programma" }).click()
  await page.waitForURL((url) => /\/portale\/iscrizioni\/\d+\/programma$/.test(url.pathname), {
    timeout: 15_000,
  })

  await expect(page.getByText("Le mie note")).toBeVisible()
  await expect(page.getByText("Nessuna nota inserita.")).toBeVisible()

  // Aggiunge una nota.
  await page.getByPlaceholder("Scrivi una nuova nota…").fill("Sto migliorando sul ritmo")
  await page.getByRole("button", { name: "Aggiungi nota" }).click()

  // Con un'unica nota in elenco, il div "rounded-md border p-3" successivo
  // al form di aggiunta (stessa classe, primo elemento) è la card della
  // nota: posizionale invece che per testo, per restare valido anche dopo
  // che l'edit inline sostituisce il testo visualizzato con una textarea.
  const notaCard = page.locator("div.rounded-md.border.p-3").last()
  await expect(notaCard.getByText("Sto migliorando sul ritmo")).toBeVisible()
  await expect(page.getByPlaceholder("Scrivi una nuova nota…")).toHaveValue("")

  // Modifica la nota: submit esplicito con Salva/Annulla, non autosave.
  await notaCard.getByRole("button", { name: "Modifica" }).click()
  await notaCard.locator("textarea").fill("Sto migliorando molto sul ritmo")
  await notaCard.getByRole("button", { name: "Salva" }).click()
  await expect(notaCard.getByText("Sto migliorando molto sul ritmo")).toBeVisible()
  await expect(notaCard.getByText(/modificata il/)).toBeVisible()

  // Elimina la nota, con conferma.
  await notaCard.getByRole("button", { name: "Rimuovi" }).click()
  await page.getByRole("button", { name: "Rimuovi" }).last().click()
  await expect(page.getByText("Nessuna nota inserita.")).toBeVisible()
})

test("il pannello insegnante mostra le autovalutazioni dell'alunno in sola lettura, senza controlli di scrittura", async ({
  page,
}) => {
  const apiAlunno = await createApiContextComeUtente(
    datiTest.utente.email,
    datiTest.utente.password,
  )
  const autovalutazioneRes = await apiAlunno.post(
    `schede-alunno/me/${datiTest.iscrizione.id}/autovalutazioni`,
    { data: { testo: "Nota e2e per l'insegnante" } },
  )
  expect(autovalutazioneRes.ok()).toBeTruthy()
  const autovalutazione = await autovalutazioneRes.json()

  try {
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
    await expect(dialog.getByText("Note dell'alunno")).toBeVisible()
    await expect(dialog.getByText("Nota e2e per l'insegnante")).toBeVisible()

    // Sola lettura: nessun controllo di scrittura nella sezione note (né il
    // form "Aggiungi nota" né i pulsanti Modifica/Rimuovi sulla voce).
    await expect(dialog.getByPlaceholder("Scrivi una nuova nota…")).toHaveCount(0)
    const notaCard = dialog
      .locator("div.rounded-md.border.p-3")
      .filter({ hasText: "Nota e2e per l'insegnante" })
    await expect(notaCard.getByRole("button")).toHaveCount(0)
  } finally {
    await apiAlunno.delete(
      `schede-alunno/me/${datiTest.iscrizione.id}/autovalutazioni/${autovalutazione.id}`,
    )
    await apiAlunno.dispose()
  }
})
