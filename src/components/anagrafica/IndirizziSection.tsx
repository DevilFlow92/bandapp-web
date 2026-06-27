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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import ComuneSelect from "@/components/ui/ComuneSelect"
import { useToast } from "@/hooks/use-toast"
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
            <div className="space-y-2">
              <Label htmlFor="tipo-indirizzo">Tipo indirizzo</Label>
              <Select
                value={form.tipo_indirizzo_codice ? String(form.tipo_indirizzo_codice) : undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo_indirizzo_codice: Number(v) }))}
              >
                <SelectTrigger id="tipo-indirizzo">
                  <SelectValue placeholder="Seleziona tipo…" />
                </SelectTrigger>
                <SelectContent>
                  {tipi?.map((t) => (
                    <SelectItem key={t.codice} value={String(t.codice)}>
                      {t.descrizione}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prima-riga">Prima riga *</Label>
                <Input
                  id="prima-riga"
                  value={form.prima_riga}
                  onChange={(e) => setForm((f) => ({ ...f, prima_riga: e.target.value }))}
                  placeholder="Via / Piazza…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero-civico">Numero civico</Label>
                <Input
                  id="numero-civico"
                  value={form.numero_civico ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, numero_civico: e.target.value || null }))
                  }
                  placeholder="es. 12/A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cap">CAP</Label>
                <Input
                  id="cap"
                  value={form.cap ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, cap: e.target.value || null }))}
                  placeholder="es. 00100"
                />
              </div>
            </div>

            <ComuneSelect
              label="Comune"
              value={form.comune_codice ?? null}
              onChange={(codice) => setForm((f) => ({ ...f, comune_codice: codice }))}
            />

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
