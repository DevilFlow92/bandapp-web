import { Outlet } from "react-router-dom"
import { LogOut, Music } from "lucide-react"
import { useCurrentUser, useLogout } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import { Button } from "@/components/ui/button"

export default function PortaleLayout() {
  const { data: user } = useCurrentUser()
  const { banda } = useBanda()
  const logout = useLogout()

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-2" style={{ color: "#1A1A2E" }}>
          <Music className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">
            {banda?.descrizione ?? "BandApp"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline truncate text-sm text-muted-foreground">
            {user?.nome_completo}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Esci
          </Button>
        </div>
      </header>
      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
