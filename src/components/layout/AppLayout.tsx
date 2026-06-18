import { NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Music,
  FileText,
  Wallet,
  LogOut,
  Repeat,
} from "lucide-react"
import { useCurrentUser, useLogout } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/soci", label: "Soci", icon: Users, end: false },
  { to: "/esterni", label: "Esterni", icon: UserPlus, end: false },
  { to: "/servizi", label: "Servizi", icon: Music, end: false },
  { to: "/spartiti", label: "Spartiti", icon: FileText, end: false },
  { to: "/contabilita", label: "Contabilità", icon: Wallet, end: false },
] as const

export default function AppLayout() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const { banda, clearBanda } = useBanda()
  const navigate = useNavigate()

  const handleChangeBanda = () => {
    clearBanda()
    navigate("/banda")
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <aside
        className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col text-white"
        style={{ backgroundColor: "#1A1A2E" }}
      >
        <div className="flex h-16 items-center gap-2 px-6">
          <Music className="h-6 w-6 text-primary-foreground" />
          <span className="text-xl font-semibold tracking-tight">BandApp</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 min-w-0">
            <p className="truncate text-sm font-medium">
              {user?.nome_completo ?? "Utente"}
            </p>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="h-4 w-4" />
            Esci
          </Button>
        </div>
      </aside>

      <div className="pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-6">
          <h1 className="text-lg font-semibold">
            Gestionale Associazione Musicale
          </h1>
          <div className="flex items-center gap-3">
            {banda && (
              <span className="text-sm text-muted-foreground">
                Banda: <span className="font-medium text-foreground">{banda.descrizione}</span>
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleChangeBanda}>
              <Repeat className="mr-2 h-4 w-4" />
              Cambia banda
            </Button>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
