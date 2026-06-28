import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { LoginRequest, User } from "@/types/auth"
import { redirectToOAuth } from "@/lib/oauth"
import type { OAuthProvider } from "@/lib/oauth"

export const AUTH_ME_KEY = ["auth", "me"] as const

/** Fetches the currently authenticated user from the session cookie. */
export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_ME_KEY,
    queryFn: async () => {
      const { data } = await api.get<User>("/auth/me")
      return data
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

/** Logs in via cookie-based session auth. */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const { data } = await api.post<User>("/auth/login", credentials)
      return data
    },
    onSuccess: () => {
      // The login response sets the session cookie; refetch /auth/me to hydrate.
      queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY })
    },
  })
}

/**
 * Returns whether the current user holds the given permission code.
 * Superusers bypass all checks. Single source of truth for RBAC in the UI.
 */
export function usePermission(codice: string): boolean {
  const { data: user } = useCurrentUser()
  return user?.superuser === true || user?.permessi?.includes(codice) === true
}

/** Revokes the current session and clears the cached user. */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY })
    },
  })
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      await api.post("/auth/password-reset/request", { email })
    },
  })
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: async ({ token, new_password }: { token: string; new_password: string }) => {
      await api.post("/auth/password-reset/confirm", { token, new_password })
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: {
      email: string
      password: string
      nome_completo?: string
      banda_codice: number
    }) => {
      await api.post("/auth/register", data)
    },
  })
}

export function useOAuthLogin() {
  return {
    login: (provider: OAuthProvider) => redirectToOAuth(provider),
  }
}
