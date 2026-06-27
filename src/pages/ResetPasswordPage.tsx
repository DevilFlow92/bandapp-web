import { useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useConfirmPasswordReset } from "@/hooks/useAuth"
import { getErrorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const confirm = useConfirmPasswordReset()
  const [password, setPassword] = useState("")
  const [confirm_password, setConfirmPassword] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    if (password.length < 8) {
      setValidationError("La password deve essere di almeno 8 caratteri.")
      return
    }
    if (password !== confirm_password) {
      setValidationError("Le password non coincidono.")
      return
    }
    confirm.mutate({ token, new_password: password })
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Link non valido</CardTitle>
            <CardDescription>
              Il link di reset non è valido.{" "}
              <Link to="/login" className="underline">
                Torna al login
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Nuova password</CardTitle>
          <CardDescription>Inserisci la tua nuova password</CardDescription>
        </CardHeader>
        {confirm.isSuccess ? (
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-sm">Password aggiornata con successo.</p>
            <Button asChild className="w-full">
              <Link to="/login">Vai al login</Link>
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {(validationError || confirm.isError) && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {validationError ?? getErrorMessage(confirm.error, "Token non valido o scaduto.")}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Nuova password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Conferma password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  required
                  minLength={8}
                  value={confirm_password}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={confirm.isPending}>
                {confirm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reimposta password
              </Button>
            </CardContent>
          </form>
        )}
      </Card>
      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} BandApp — Developed by{" "}
        <a
          href="https://cosequences.com"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cosequences.com
        </a>
      </p>
    </div>
  )
}
