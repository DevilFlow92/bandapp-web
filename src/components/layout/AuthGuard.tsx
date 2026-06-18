import { Navigate, Outlet } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useCurrentUser } from "@/hooks/useAuth"

export default function AuthGuard() {
  const { data: user, isLoading } = useCurrentUser()

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

  return <Outlet />
}
