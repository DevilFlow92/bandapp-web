import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useCurrentUser } from "@/hooks/useAuth"
import { toast } from "@/hooks/use-toast"

interface PermissionGuardProps {
  permission: string
}

export default function PermissionGuard({ permission }: PermissionGuardProps) {
  const { data: user, isLoading } = useCurrentUser()
  const allowed = user?.superuser === true || user?.permessi?.includes(permission) === true
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
