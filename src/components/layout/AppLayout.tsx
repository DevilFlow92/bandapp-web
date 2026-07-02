import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { LayoutDashboard, Music, LogOut, Repeat, Menu, FileText } from "lucide-react"
import { useCurrentUser, useLogout, usePermission } from "@/hooks/useAuth"
import { useBanda } from "@/context/BandaContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"

type NavItem = { to: string; label: string; icon?: React.ReactNode }
type NavGroup = { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: "Anagrafica",
    items: [
      { to: "/soci", label: "Soci" },
      { to: "/esterni", label: "Esterni" },
    ],
  },
  {
    label: "Attività",
    items: [
      { to: "/servizi", label: "Servizi" },
      { to: "/iscrizioni", label: "Iscrizioni" },
    ],
  },
  {
    label: "Archivio",
    items: [
      { to: "/spartiti", label: "Spartiti" },
      { to: "/documenti", label: "Documenti" },
    ],
  },
  {
    label: "Modulistica",
    items: [
      { to: "/modulistica", label: "Modulistica", icon: <FileText className="h-4 w-4 shrink-0" /> },
    ],
  },
  {
    label: "Contabilità",
    items: [
      { to: "/contabilita/configurazione", label: "Configurazione" },
      { to: "/contabilita/voci", label: "Piano dei conti" },
      { to: "/contabilita/movimenti", label: "Movimenti" },
      { to: "/contabilita/rendiconto", label: "Rendiconto" },
      { to: "/contabilita/check-quote", label: "Check Quote" },
    ],
  },
]

const adminGroup: NavGroup = {
  label: "Amministrazione",
  items: [
    { to: "/admin/utenti", label: "Utenti" },
    { to: "/admin/ruoli", label: "Ruoli" },
  ],
}

interface SidebarNavProps {
  groups: NavGroup[]
  onNavigate?: () => void
}

function SidebarNav({ groups, onNavigate }: SidebarNavProps) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      <NavLink
        to="/"
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
          )
        }
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        Dashboard
      </NavLink>

      {groups.map((group, i) => (
        <div key={group.label}>
          {i > 0 && <hr className="border-slate-700 mx-3 my-1" />}
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 pt-4 pb-1">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white",
                  )
                }
              >
                {icon}
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

export default function AppLayout() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const { banda, clearBanda } = useBanda()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleChangeBanda = () => {
    clearBanda()
    navigate("/banda")
  }

  const canContabilita = usePermission("contabilita:read")
  const canUtenti = usePermission("utenti:read")
  const canRuoli = usePermission("ruoli:read")
  const canIscrizioni = usePermission("iscrizioni:read")
  const canAdmin = user?.superuser === true || canUtenti || canRuoli
  const groups = [
    ...navGroups
      .map((g) => {
        if (g.label !== "Attività") return g
        return {
          ...g,
          items: g.items.filter((item) => item.to !== "/iscrizioni" || canIscrizioni),
        }
      })
      .filter((g) => g.label !== "Contabilità" || canContabilita),
    ...(canAdmin ? [adminGroup] : []),
  ]

  const sidebarFooter = (
    <div className="border-t border-white/10 p-4">
      <div className="mb-3 min-w-0">
        <p className="truncate text-sm font-medium">{user?.nome_completo ?? "Utente"}</p>
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
  )

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden lg:flex w-60 flex-col text-white"
        style={{ backgroundColor: "#1A1A2E" }}
      >
        <div className="flex h-16 items-center gap-2 px-6">
          <Music className="h-6 w-6 text-primary-foreground" />
          <span className="text-xl font-semibold tracking-tight">BandApp</span>
        </div>
        <SidebarNav groups={groups} />
        {sidebarFooter}
      </aside>

      {/* Mobile header */}
      <header className="flex lg:hidden sticky top-0 z-30 h-16 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-2" style={{ color: "#1A1A2E" }}>
          <Music className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">BandApp</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Apri menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-60 p-0 text-white border-none"
          style={{ backgroundColor: "#1A1A2E" }}
        >
          <div className="flex h-16 items-center gap-2 px-6">
            <Music className="h-6 w-6 text-primary-foreground" />
            <span className="text-xl font-semibold tracking-tight">BandApp</span>
          </div>
          <div className="flex flex-col h-[calc(100%-4rem)]">
            <SidebarNav groups={groups} onNavigate={() => setMobileMenuOpen(false)} />
            {sidebarFooter}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 hidden lg:flex h-16 items-center justify-between border-b bg-background px-6">
          <h1 className="text-lg font-semibold">Gestionale Associazione Musicale</h1>
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
        {/* Mobile banda/actions bar */}
        <div className="flex lg:hidden items-center justify-between border-b bg-background px-4 py-2">
          {banda ? (
            <span className="text-sm text-muted-foreground">
              Banda: <span className="font-medium text-foreground">{banda.descrizione}</span>
            </span>
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={handleChangeBanda}>
            <Repeat className="mr-2 h-4 w-4" />
            Cambia banda
          </Button>
        </div>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
