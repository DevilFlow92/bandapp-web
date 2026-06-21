import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useSetPassword } from "@/hooks/useAdmin"
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

interface SetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  utente: Utente | null
}

export default function SetPasswordDialog({ open, onOpenChange, utente }: SetPasswordDialogProps) {
  const { toast } = useToast()
  const setPassword = useSetPassword()

  const [password, setPwd] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPwd("")
    setConfirm("")
    setError(null)
  }, [open])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!utente) return
    if (!password) {
      setError("La password è obbligatoria.")
      return
    }
    if (password !== confirm) {
      setError("Le password non coincidono.")
      return
    }

    try {
      await setPassword.mutateAsync({ id: utente.id, password })
      toast({ title: "Password aggiornata" })
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambia password</DialogTitle>
          <DialogDescription>Imposta una nuova password per {utente?.email}.</DialogDescription>
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
            <Label htmlFor="new-password">Nuova password *</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPwd(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Conferma password *</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={setPassword.isPending}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={setPassword.isPending}>
              {setPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
