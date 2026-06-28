import { Navigate, Outlet, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useCurrentUser } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"

export default function AuthGuard() {
  // OAuth redirects here after successful login. The backend sets the session cookie,
  // and useCurrentUser() will refetch /auth/me to hydrate the session. The axios
  // instance is configured with withCredentials: true, so the cookie is sent.
  const { data: user, isLoading } = useCurrentUser()
  const { banda } = useBanda()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in but no banda selected: force selection before the app.
  if (!banda && location.pathname !== "/banda") {
    return <Navigate to="/banda" replace />
  }

  return <Outlet />
}
