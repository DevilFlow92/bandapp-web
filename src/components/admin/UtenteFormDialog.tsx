import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useCreateUtente, useRuoli, useUpdateUtente } from "@/hooks/useAdmin"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Utente } from "@/types/admin"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const RUOLI_PAGE_SIZE = 100

interface UtenteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog opens in edit mode. */
  utente?: Utente | null
}

interface UtenteFormState {
  email: string
  nome_completo: string
  tipo: "umano" | "servizio"
  password: string
  attivo: boolean
  superuser: boolean
  ruoli: number[]
}

const emptyForm: UtenteFormState = {
  email: "",
  nome_completo: "",
  tipo: "umano",
  password: "",
  attivo: true,
  superuser: false,
  ruoli: [],
}

export default function UtenteFormDialog({ open, onOpenChange, utente }: UtenteFormDialogProps) {
  const isEdit = Boolean(utente)
  const { toast } = useToast()

  const createUtente = useCreateUtente()
  const updateUtente = useUpdateUtente()
  const ruoli = useRuoli(1, RUOLI_PAGE_SIZE)

  const [form, setForm] = useState<UtenteFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (utente) {
      setForm({
        email: utente.email,
        nome_completo: utente.nome_completo ?? "",
        tipo: utente.tipo,
        password: "",
        attivo: utente.attivo,
        superuser: utente.superuser,
        ruoli: utente.ruoli.map((r) => r.id),
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, utente])

  const isSubmitting = createUtente.isPending || updateUtente.isPending
  const ruoliList = useMemo(() => ruoli.data?.items ?? [], [ruoli.data])

  const toggleRuolo = (id: number) => {
    setForm((f) => ({
      ...f,
      ruoli: f.ruoli.includes(id) ? f.ruoli.filter((r) => r !== id) : [...f.ruoli, id],
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      if (isEdit && utente) {
        await updateUtente.mutateAsync({
          id: utente.id,
          input: {
            nome_completo: form.nome_completo.trim() || null,
            attivo: form.attivo,
            superuser: form.superuser,
            ruoli: form.ruoli,
          },
        })
        toast({ title: "Utente aggiornato" })
      } else {
        if (!form.email.trim()) {
          setError("L'email è obbligatoria.")
          return
        }
        if (form.tipo === "umano" && !form.password) {
          setError("La password è obbligatoria per gli utenti umani.")
          return
        }
        await createUtente.mutateAsync({
          email: form.email.trim(),
          nome_completo: form.nome_completo.trim() || null,
          tipo: form.tipo,
          password: form.password || undefined,
          superuser: form.superuser,
          ruoli: form.ruoli,
        })
        toast({ title: "Utente creato" })
      }
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica utente" : "Nuovo utente"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Aggiorna i dati dell'utente." : "Inserisci i dati del nuovo utente."}
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
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              disabled={isEdit}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_completo">Nome completo</Label>
            <Input
              id="nome_completo"
              value={form.nome_completo}
              onChange={(e) => setForm((f) => ({ ...f, nome_completo: e.target.value }))}
            />
          </div>

          {!isEdit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(value) =>
                    setForm((f) => ({
                      ...f,
                      tipo: value as "umano" | "servizio",
                    }))
                  }
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="umano">Umano</SelectItem>
                    <SelectItem value="servizio">Servizio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password {form.tipo === "umano" ? "*" : ""}</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  autoComplete="new-password"
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>
          )}

          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={form.attivo}
                onChange={(e) => setForm((f) => ({ ...f, attivo: e.target.checked }))}
              />
              Attivo
            </label>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={form.superuser}
              onChange={(e) => setForm((f) => ({ ...f, superuser: e.target.checked }))}
            />
            Superuser
          </label>

          <div className="space-y-2">
            <Label>Ruoli</Label>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-3">
              {ruoli.isLoading ? (
                <p className="text-sm text-muted-foreground">Caricamento…</p>
              ) : ruoliList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun ruolo disponibile</p>
              ) : (
                ruoliList.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={form.ruoli.includes(r.id)}
                      onChange={() => toggleRuolo(r.id)}
                    />
                    {r.nome}
                  </label>
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
