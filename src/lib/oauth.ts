export const OAUTH_PROVIDERS = ["google", "apple", "facebook"] as const
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

/**
 * Redirects the browser to the backend OAuth2 redirect endpoint.
 * This is a full-page navigation — NOT an Axios call.
 */
export function redirectToOAuth(provider: OAuthProvider): void {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000"
  window.location.href = `${base}/auth/oauth/${provider}`
}
