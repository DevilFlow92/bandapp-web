import { useState } from "react"
import { Trash2 } from "lucide-react"
import {
  usePersonaContatti,
  useCreateContatto,
  useDeleteContatto,
  useLookupRuoliContatto,
} from "@/hooks/useContatti"
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
import { useToast } from "@/hooks/use-toast"

interface ContattiSectionProps {
  personaId: number
  canWrite: boolean
}

interface FormState {
  ruolo_contatto_codice: number
  email: string
  telefono: string
}

const emptyForm: FormState = {
  ruolo_contatto_codice: 0,
  email: "",
  telefono: "",
}

export default function ContattiSection({ personaId, canWrite }: ContattiSectionProps) {
  const { toast } = useToast()

  const { data: contatti, isLoading } = usePersonaContatti(personaId)
  const { data: ruoli } = useLookupRuoliContatto()
  const createMutation = useCreateContatto(personaId)
  const deleteMutation = useDeleteContatto(personaId)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const ruoloById = new Map(ruoli?.map((r) => [r.codice, r.descrizione]) ?? [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.ruolo_contatto_codice) {
      setFormError("Seleziona il ruolo contatto.")
      return
    }
    if (!form.email.trim() && !form.telefono.trim()) {
      setFormError("Inserisci almeno un'email o un numero di telefono.")
      return
    }

    try {
      await createMutation.mutateAsync({
        persona_id: personaId,
        ruolo_contatto_codice: form.ruolo_contatto_codice,
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
      })
      setShowForm(false)
      setForm(emptyForm)
      toast({ title: "Contatto aggiunto" })
    } catch {
      setFormError("Errore durante il salvataggio. Riprova.")
    }
  }

  const handleDelete = async (contattoId: number) => {
    try {
      await deleteMutation.mutateAsync(contattoId)
      toast({ title: "Contatto rimosso" })
    } catch {
      toast({ title: "Errore durante la rimozione", variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Contatti</CardTitle>
        {canWrite && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            + Aggiungi contatto
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : contatti && contatti.length > 0 ? (
          <ul className="divide-y">
            {contatti.map((contatto) => {
              const ruolo =
                ruoloById.get(contatto.ruolo_contatto_codice) ??
                String(contatto.ruolo_contatto_codice)
              return (
                <li key={contatto.id} className="flex items-start justify-between gap-2 py-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">{ruolo}</p>
                    <p className="text-sm">
                      {contatto.email ? (
                        <a href={`mailto:${contatto.email}`} className="underline">
                          {contatto.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contatto.telefono ? (
                        <a href={`tel:${contatto.telefono}`} className="underline">
                          {contatto.telefono}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(contatto.id)}
                      disabled={deleteMutation.isPending}
                      aria-label="Rimuovi contatto"
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
              Nessun contatto registrato
            </p>
          )
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
            <div className="space-y-2">
              <Label htmlFor="ruolo-contatto">Ruolo contatto</Label>
              <Select
                value={form.ruolo_contatto_codice ? String(form.ruolo_contatto_codice) : undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, ruolo_contatto_codice: Number(v) }))}
              >
                <SelectTrigger id="ruolo-contatto">
                  <SelectValue placeholder="Seleziona ruolo…" />
                </SelectTrigger>
                <SelectContent>
                  {ruoli?.map((r) => (
                    <SelectItem key={r.codice} value={String(r.codice)}>
                      {r.descrizione}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contatto-email">Email</Label>
                <Input
                  id="contatto-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="es. nome@esempio.it"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contatto-telefono">Telefono</Label>
                <Input
                  id="contatto-telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="es. +39 333 1234567"
                />
              </div>
            </div>

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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvataggio…" : "Salva"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
