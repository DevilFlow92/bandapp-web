import axios, { isAxiosError } from "axios"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1"

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      // Avoid a redirect loop when the 401 originates from the login page
      // itself (e.g. the GET /auth/me probe or a failed login attempt).
      if (window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  },
)

/** Extracts a human-readable message from an Axios/unknown error. */
export function getErrorMessage(
  error: unknown,
  fallback = "Si è verificato un errore. Riprova.",
): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
    return error.message || fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export default api
