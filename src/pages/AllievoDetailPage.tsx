import type { ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useAllievo } from "@/hooks/useAllievi"
import { usePermission } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import IndirizziSection from "@/components/anagrafica/IndirizziSection"
import ContattiSection from "@/components/anagrafica/ContattiSection"
import PercorsoFormativoSection from "@/components/allievi/PercorsoFormativoSection"

/** Formats an ISO date string ("YYYY-MM-DD") as "DD/MM/YYYY". */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [year, month, day] = iso.slice(0, 10).split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

export default function AllievoDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const allievoId = Number(id)

  const { data: allievo, isLoading, isError } = useAllievo(allievoId)
  // Stesso permesso usato in AllieviPage per queste sezioni: gli allievi
  // sono un sottodominio di "corsi", non di "anagrafica" come i soci.
  const canWrite = usePermission("corsi:write")

  const persona = allievo?.persona
  const fullName = persona ? `${persona.nome} ${persona.cognome}`.trim() : ""

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit text-muted-foreground"
      onClick={() => navigate("/allievi")}
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      Allievi
    </Button>
  )

  if (isError) {
    return (
      <div className="space-y-6">
        {backButton}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Errore nel caricamento dell'allievo.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Section 1 — Anagrafica */}
      <Card className="lg:col-span-1">
        <CardHeader className="space-y-3">
          {backButton}
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <CardTitle className="text-2xl">{fullName || "—"}</CardTitle>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-28" />
                </div>
              ))}
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Codice Allievo" value={allievo?.codice_allievo ?? "—"} />
              <Field label="Codice Fiscale" value={persona?.codice_fiscale ?? "—"} />
              <Field label="Data di Nascita" value={formatDate(persona?.data_nascita)} />
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Section 2 — Percorso formativo pluriennale */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Percorso formativo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            allievo && <PercorsoFormativoSection personaId={allievo.persona_id} />
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Indirizzi & Contatti */}
      {allievo?.persona?.id && (
        <div className="lg:col-span-3 grid gap-6 lg:grid-cols-2">
          <IndirizziSection personaId={allievo.persona.id} canWrite={canWrite} />
          <ContattiSection personaId={allievo.persona.id} canWrite={canWrite} />
        </div>
      )}
    </div>
  )
}
