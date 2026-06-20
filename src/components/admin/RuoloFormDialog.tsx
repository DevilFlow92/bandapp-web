import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  type CreateRuoloInput,
  useCreateRuolo,
  usePermessi,
  useUpdateRuolo,
} from "@/hooks/useAdmin"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Permesso, Ruolo } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RuoloFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  ruolo?: Ruolo | null
}

interface RuoloFormState {
  nome: string
  descrizione: string
  permessi: string[]
}

const emptyForm: RuoloFormState = {
  nome: "",
  descrizione: "",
  permessi: [],
}

/** Groups permessi by the domain prefix of their codice (e.g. "anagrafica"). */
function groupByDomain(permessi: Permesso[]): [string, Permesso[]][] {
  const groups = new Map<string, Permesso[]>()
  for (const p of permessi) {
    const domain = p.codice.split(":")[0]
    const bucket = groups.get(domain) ?? []
    bucket.push(p)
    groups.set(domain, bucket)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
}

export default function RuoloFormDialog({
  open,
  onOpenChange,
  ruolo,
}: RuoloFormDialogProps) {
  const isEdit = Boolean(ruolo)
  const { toast } = useToast()

  const createRuolo = useCreateRuolo()
  const updateRuolo = useUpdateRuolo()
  const permessi = usePermessi()

  const [form, setForm] = useState<RuoloFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (ruolo) {
      setForm({
        nome: ruolo.nome,
        descrizione: ruolo.descrizione ?? "",
        permessi: ruolo.permessi.map((p) => p.codice),
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, ruolo])

  const isSubmitting = createRuolo.isPending || updateRuolo.isPending
  const groups = useMemo(
    () => groupByDomain(permessi.data ?? []),
    [permessi.data]
  )

  const togglePermesso = (codice: string) => {
    setForm((f) => ({
      ...f,
      permessi: f.permessi.includes(codice)
        ? f.permessi.filter((p) => p !== codice)
        : [...f.permessi, codice],
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!form.nome.trim()) {
      setError("Il nome è obbligatorio.")
      return
    }

    try {
      if (isEdit && ruolo) {
        await updateRuolo.mutateAsync({
          id: ruolo.id,
          input: {
            nome: form.nome.trim(),
            descrizione: form.descrizione.trim() || null,
            permessi: form.permessi,
          },
        })
        toast({ title: "Ruolo aggiornato" })
      } else {
        const payload: CreateRuoloInput = {
          nome: form.nome.trim(),
          descrizione: form.descrizione.trim() || null,
          // Roles created here are global: send an explicit null, never 0 or "",
          // which the backend would treat as a (non-existent) banda FK → 409.
          banda_codice: null,
          // permessi must be a string[] of codici, e.g. ["anagrafica:read"].
          permessi: form.permessi,
        }
        await createRuolo.mutateAsync(payload)
        toast({ title: "Ruolo creato" })
      }
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica ruolo" : "Nuovo ruolo"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dati del ruolo."
              : "Inserisci i dati del nuovo ruolo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descrizione">Descrizione</Label>
            <Input
              id="descrizione"
              value={form.descrizione}
              onChange={(e) =>
                setForm((f) => ({ ...f, descrizione: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Permessi</Label>
            <div className="space-y-4 rounded-md border p-3">
              {permessi.isLoading ? (
                <p className="text-sm text-muted-foreground">Caricamento…</p>
              ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nessun permesso disponibile
                </p>
              ) : (
                groups.map(([domain, perms]) => (
                  <div key={domain} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {domain}
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {perms.map((p) => (
                        <label
                          key={p.codice}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={form.permessi.includes(p.codice)}
                            onChange={() => togglePermesso(p.codice)}
                          />
                          {p.descrizione}
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salva" : "Crea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
