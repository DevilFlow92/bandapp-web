import { Users, UserCheck, Music, FileText } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useBanda } from "@/context/BandaContext"
import { useDashboardKPI } from "@/hooks/useDashboard"

interface Kpi {
  label: string
  value: number
  icon: LucideIcon
  subtitle?: string
}

export default function DashboardPage() {
  const { banda } = useBanda()
  const currentYear = new Date().getFullYear()
  const { sociTotali, sociAttivi, serviziAnno, iscrizioniAnno, isLoading, isError } =
    useDashboardKPI(banda!.codice)

  const kpis: Kpi[] = [
    { label: "Soci Totali", value: sociTotali, icon: Users },
    {
      label: "Soci Attivi",
      value: sociAttivi,
      icon: UserCheck,
      subtitle: `Anno ${currentYear}`,
    },
    {
      label: "Servizi",
      value: serviziAnno,
      icon: Music,
      subtitle: `Anno ${currentYear}`,
    },
    {
      label: "Iscrizioni",
      value: iscrizioniAnno,
      icon: FileText,
      subtitle: `Anno ${currentYear}`,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Panoramica generale dell'associazione</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, subtitle }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <div className="text-3xl font-bold">{isError ? "—" : value}</div>
              )}
              {isError ? (
                <p className="text-xs text-muted-foreground mt-1">Errore nel caricamento</p>
              ) : (
                subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
