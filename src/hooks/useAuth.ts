import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { LoginRequest, User } from "@/types/auth"

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
