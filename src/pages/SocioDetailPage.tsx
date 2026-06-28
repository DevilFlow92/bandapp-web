import { useMemo, useState, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Plus } from "lucide-react"
import { useSocio } from "@/hooks/useSoci"
import { useIscrizioni, useLookupStatiIscrizione } from "@/hooks/useIscrizioni"
import { usePermission } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import IscrizioneFormDialog from "@/components/iscrizioni/IscrizioneFormDialog"
import IndirizziSection from "@/components/anagrafica/IndirizziSection"
import ContattiSection from "@/components/anagrafica/ContattiSection"

/** Formats an ISO date string ("YYYY-MM-DD") as "DD/MM/YYYY". */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [year, month, day] = iso.slice(0, 10).split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function formatQuota(quota: number): string {
  return `€ ${quota.toFixed(2)}`
}

/** Tailwind classes for each stato badge, keyed by descrizione. */
function statoBadgeClass(descrizione: string): string {
  switch (descrizione) {
    case "Pagata":
      return "border-transparent bg-green-100 text-green-800"
    case "Da pagare":
      return "border-transparent bg-yellow-100 text-yellow-800"
    case "Annullata":
      return "border-transparent bg-gray-100 text-gray-700"
    default:
      return ""
  }
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

export default function SocioDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const socioId = Number(id)

  const { data: socio, isLoading, isError } = useSocio(socioId)

  const { data: iscrizioniData, isLoading: iscrizioniLoading } = useIscrizioni(1, 50, socioId)

  const statiQuery = useLookupStatiIscrizione()
  const statoById = useMemo(() => {
    const map = new Map<number, string>()
    for (const stato of statiQuery.data ?? []) map.set(stato.codice, stato.descrizione)
    return map
  }, [statiQuery.data])

  // Show the storico most-recent first.
  const iscrizioni = useMemo(() => {
    const items = [...(iscrizioniData?.items ?? [])]
    items.sort((a, b) => b.anno - a.anno || b.data_iscrizione.localeCompare(a.data_iscrizione))
    return items
  }, [iscrizioniData])

  const canWrite = usePermission("anagrafica:write")
  const [formOpen, setFormOpen] = useState(false)

  const persona = socio?.persona
  const fullName = persona ? `${persona.nome} ${persona.cognome}`.trim() : ""

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit text-muted-foreground"
      onClick={() => navigate("/soci")}
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      Soci
    </Button>
  )

  if (isError) {
    return (
      <div className="space-y-6">
        {backButton}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Errore nel caricamento del socio.
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
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-28" />
                </div>
              ))}
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Codice Socio" value={socio?.codice_socio ?? "—"} />
              <Field label="Strumento" value={socio?.strumento?.descrizione ?? "—"} />
              <Field label="Ruolo in Banda" value={socio?.ruolo_banda?.descrizione ?? "—"} />
              <Field label="Codice Fiscale" value={persona?.codice_fiscale ?? "—"} />
              <Field label="Data di Nascita" value={formatDate(persona?.data_nascita)} />
              <Field
                label="Comune di Nascita"
                value={persona?.comune_nascita?.descrizione ?? "—"}
              />
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Section 2 — Iscrizioni */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Iscrizioni</CardTitle>
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={isLoading || !socio}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova iscrizione
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anno</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Quota</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {iscrizioniLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : iscrizioni.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        Nessuna iscrizione registrata
                      </TableCell>
                    </TableRow>
                  ) : (
                    iscrizioni.map((iscrizione) => {
                      const descrizione = statoById.get(iscrizione.stato_iscrizione_codice)
                      return (
                        <TableRow key={iscrizione.id}>
                          <TableCell className="font-medium">{iscrizione.anno}</TableCell>
                          <TableCell>{formatDate(iscrizione.data_iscrizione)}</TableCell>
                          <TableCell>{formatQuota(iscrizione.quota_partecipazione)}</TableCell>
                          <TableCell>
                            {descrizione ? (
                              <Badge variant="outline" className={statoBadgeClass(descrizione)}>
                                {descrizione}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{iscrizione.note || "—"}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3 — Indirizzi & Contatti */}
      {socio?.persona?.id && (
        <>
          <div className="lg:col-span-3 grid gap-6 lg:grid-cols-2">
            <IndirizziSection personaId={socio.persona.id} canWrite={canWrite} />
            <ContattiSection personaId={socio.persona.id} canWrite={canWrite} />
          </div>
        </>
      )}

      <IscrizioneFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        presetSocio={socio ?? null}
      />
    </div>
  )
}
