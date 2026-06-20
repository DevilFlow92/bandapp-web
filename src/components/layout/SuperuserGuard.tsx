import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useCurrentUser } from "@/hooks/useAuth"
import { toast } from "@/hooks/use-toast"

/**
 * Restricts the wrapped routes to superusers. Non-superusers are bounced to the
 * dashboard with a toast. Assumes it is nested inside <AuthGuard>, so by the
 * time it renders the current user is already loaded (or loading).
 */
export default function SuperuserGuard() {
  const { data: user, isLoading } = useCurrentUser()
  const allowed = user?.superuser === true
  const denied = !isLoading && !allowed

  useEffect(() => {
    if (denied) {
      toast({ variant: "destructive", title: "Accesso non autorizzato" })
    }
  }, [denied])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!allowed) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
