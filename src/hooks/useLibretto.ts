import { isAxiosError } from "axios"
import api, { getErrorMessage } from "@/lib/api"

/**
 * Extracts the backend's `detail` message from a failed libretto request. The
 * endpoint is fetched with `responseType: "blob"` (see downloadLibretto*
 * below), so on error `error.response.data` is itself a Blob containing the
 * JSON error body rather than parsed JSON — getErrorMessage alone can't read
 * it. This reads the blob as text and falls back to getErrorMessage if it
 * isn't JSON with a `detail` field.
 */
async function getLibrettoErrorMessage(error: unknown): Promise<string> {
  if (isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text()
      const parsed = JSON.parse(text) as { detail?: unknown }
      if (typeof parsed.detail === "string") return parsed.detail
    } catch {
      // Not JSON (or empty body): fall through to getErrorMessage below.
    }
  }
  return getErrorMessage(error)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Sanitizes a persona's name into a filesystem-safe token, mirroring the backend's _nome_file_persona. */
export function nomeFilePersona(
  persona: { nome?: string | null; cognome?: string | null } | null | undefined,
  personaId: number,
): string {
  const parti = [persona?.cognome, persona?.nome].filter((p): p is string => !!p)
  const base = parti.length > 0 ? parti.join("_") : `persona_${personaId}`
  const sicuro = Array.from(base)
    .filter((c) => /[a-zA-Z0-9 _-]/.test(c))
    .join("")
  return sicuro.replace(/ /g, "_") || `persona_${personaId}`
}

export interface LibrettoPersonaResult {
  /** Brani il cui spartito per questa persona non è disponibile (X-Brani-Mancanti). */
  braniMancanti: string[]
}

/**
 * Downloads the libretto PDF of a single persona in the organico. Throws with
 * a backend-provided message (via getLibrettoErrorMessage) on 404: servizio
 * senza organico/repertorio, persona non in organico, o persona senza spartiti.
 */
export async function downloadLibrettoPersona(
  servizioId: number,
  personaId: number,
  filename: string,
): Promise<LibrettoPersonaResult> {
  try {
    const response = await api.get<Blob>(`/servizi/${servizioId}/libretto`, {
      params: { persona_id: personaId },
      responseType: "blob",
    })
    triggerDownload(response.data, filename)
    const header = response.headers["x-brani-mancanti"]
    const braniMancanti =
      typeof header === "string"
        ? header
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    return { braniMancanti }
  } catch (err) {
    throw Object.assign(new Error(await getLibrettoErrorMessage(err)), { cause: err })
  }
}

/**
 * Downloads the ZIP libretto of the whole organico for a servizio (one PDF per
 * persona + report.json). Throws with a backend-provided message on 404:
 * servizio senza organico o senza repertorio.
 */
export async function downloadLibrettoServizio(
  servizioId: number,
  filename: string,
): Promise<void> {
  try {
    const response = await api.get<Blob>(`/servizi/${servizioId}/libretto`, {
      responseType: "blob",
    })
    triggerDownload(response.data, filename)
  } catch (err) {
    throw Object.assign(new Error(await getLibrettoErrorMessage(err)), { cause: err })
  }
}
