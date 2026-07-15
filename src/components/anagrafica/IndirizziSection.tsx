import { useState } from "react"
import { Trash2 } from "lucide-react"
import {
  usePersonaIndirizzi,
  useAddPersonaIndirizzo,
  useRemovePersonaIndirizzo,
  useLookupTipiIndirizzo,
} from "@/hooks/useIndirizzi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import IndirizzoForm from "@/components/anagrafica/IndirizzoForm"
import type { CreateIndirizzoInput } from "@/types/indirizzo"

interface IndirizziSectionProps {
  personaId: number
  canWrite: boolean
}

const emptyForm: CreateIndirizzoInput = {
  tipo_indirizzo_codice: 0,
  prima_riga: "",
  numero_civico: null,
  cap: null,
  comune_codice: null,
}

export default function IndirizziSection({ personaId, canWrite }: IndirizziSectionProps) {
  const { toast } = useToast()

  const { data: indirizzi, isLoading } = usePersonaIndirizzi(personaId)
  const { data: tipi } = useLookupTipiIndirizzo()
  const addMutation = useAddPersonaIndirizzo(personaId)
  const removeMutation = useRemovePersonaIndirizzo(personaId)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateIndirizzoInput>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const tipoById = new Map(tipi?.map((t) => [t.codice, t.descrizione]) ?? [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.tipo_indirizzo_codice) {
      setFormError("Seleziona il tipo di indirizzo.")
      return
    }
    if (!form.prima_riga.trim()) {
      setFormError("La prima riga è obbligatoria.")
      return
    }

    try {
      await addMutation.mutateAsync(form)
      setShowForm(false)
      setForm(emptyForm)
      toast({ title: "Indirizzo aggiunto" })
    } catch {
      setFormError("Errore durante il salvataggio. Riprova.")
    }
  }

  const handleRemove = async (indirizzoId: number) => {
    try {
      await removeMutation.mutateAsync(indirizzoId)
      toast({ title: "Indirizzo rimosso" })
    } catch {
      toast({ title: "Errore durante la rimozione", variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Indirizzi</CardTitle>
        {canWrite && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            + Aggiungi indirizzo
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : indirizzi && indirizzi.length > 0 ? (
          <ul className="divide-y">
            {indirizzi.map((ind) => {
              const tipo =
                tipoById.get(ind.tipo_indirizzo_codice) ?? String(ind.tipo_indirizzo_codice)
              const line1 = [ind.prima_riga, ind.numero_civico].filter(Boolean).join(", ")
              const line2 = [ind.cap, ind.comune?.descrizione].filter(Boolean).join(" ")
              return (
                <li key={ind.id} className="flex items-start justify-between gap-2 py-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">{tipo}</p>
                    {line1 && <p className="text-sm">{line1}</p>}
                    {line2 && <p className="text-sm text-muted-foreground">{line2}</p>}
                  </div>
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(ind.id)}
                      disabled={removeMutation.isPending}
                      aria-label="Rimuovi indirizzo"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          !showForm && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nessun indirizzo registrato
            </p>
          )
        )}

        {/* Inline add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
            <IndirizzoForm value={form} onChange={setForm} tipi={tipi} />

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setForm(emptyForm)
                  setFormError(null)
                }}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Salvataggio…" : "Salva"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
