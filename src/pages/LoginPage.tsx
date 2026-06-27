import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react"
import { useCurrentUser, useLogin, useRequestPasswordReset, useRegister } from "@/hooks/useAuth"
import { useBandePublic } from "@/hooks/useBande"
import { getErrorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type View = "login" | "forgot" | "register-banda" | "register-form"

export default function LoginPage() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const login = useLogin()
  const requestReset = useRequestPasswordReset()
  const register = useRegister()
  const bande = useBandePublic()

  const [view, setView] = useState<View>("login")

  // Login fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Forgot password fields
  const [resetEmail, setResetEmail] = useState("")

  // Registration fields
  const [selectedBandaCodice, setSelectedBandaCodice] = useState<number | null>(null)
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("")
  const [regNome, setRegNome] = useState("")
  const [regValidationError, setRegValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (user) navigate("/", { replace: true })
  }, [user, navigate])

  const handleLogin = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password }, { onSuccess: () => navigate("/", { replace: true }) })
  }

  const handleForgot = (e: FormEvent) => {
    e.preventDefault()
    requestReset.mutate(resetEmail)
  }

  const handleBandaSelect = () => {
    if (selectedBandaCodice !== null) setView("register-form")
  }

  const handleRegister = (e: FormEvent) => {
    e.preventDefault()
    setRegValidationError(null)
    if (regPassword.length < 8) {
      setRegValidationError("La password deve essere di almeno 8 caratteri.")
      return
    }
    if (regPassword !== regPasswordConfirm) {
      setRegValidationError("Le password non coincidono.")
      return
    }
    if (!selectedBandaCodice) return
    register.mutate({
      email: regEmail,
      password: regPassword,
      nome_completo: regNome || undefined,
      banda_codice: selectedBandaCodice,
    })
  }

  const selectedBanda = bande.data?.find((b) => b.codice === selectedBandaCodice)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        {/* ── LOGIN ── */}
        {view === "login" && (
          <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">BandApp</CardTitle>
              <CardDescription>Accedi al gestionale dell'associazione</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {login.isError && (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {getErrorMessage(login.error, "Credenziali non valide.")}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nome@esempio.it"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={login.isPending}>
                  {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accedi
                </Button>
                <div className="flex flex-col gap-2 text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setView("forgot")}
                    className="text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Password dimenticata? Resetta la tua password!
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (bande.data?.length === 1) {
                        setSelectedBandaCodice(bande.data[0].codice)
                        setView("register-form")
                      } else {
                        setView("register-banda")
                      }
                    }}
                  >
                    Registrati
                  </Button>
                </div>
              </CardContent>
            </form>
          </>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {view === "forgot" && (
          <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl font-bold">Reset password</CardTitle>
              <CardDescription>
                Inserisci la tua email e ti invieremo un link per reimpostare la password.
              </CardDescription>
            </CardHeader>
            {requestReset.isSuccess ? (
              <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  Se l'indirizzo è registrato, riceverai un'email con le istruzioni.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setView("login")
                    requestReset.reset()
                  }}
                >
                  Torna al login
                </Button>
              </CardContent>
            ) : (
              <form onSubmit={handleForgot}>
                <CardContent className="space-y-4">
                  {requestReset.isError && (
                    <div
                      role="alert"
                      className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {getErrorMessage(requestReset.error, "Errore durante la richiesta.")}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="nome@esempio.it"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={requestReset.isPending}>
                    {requestReset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Invia link di reset
                  </Button>
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    <ArrowLeft className="h-3 w-3" /> Torna al login
                  </button>
                </CardContent>
              </form>
            )}
          </>
        )}

        {/* ── REGISTRAZIONE: SELEZIONE BANDA ── */}
        {view === "register-banda" && (
          <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl font-bold">Registrati</CardTitle>
              <CardDescription>Seleziona la tua banda di appartenenza</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bande.isLoading ? (
                <p className="text-center text-sm text-muted-foreground">Caricamento bande…</p>
              ) : bande.isError ? (
                <p className="text-center text-sm text-destructive">
                  Impossibile caricare le bande.
                </p>
              ) : (
                <Select onValueChange={(v) => setSelectedBandaCodice(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una banda…" />
                  </SelectTrigger>
                  <SelectContent>
                    {bande.data?.map((b) => (
                      <SelectItem key={b.codice} value={String(b.codice)}>
                        {b.descrizione}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                className="w-full"
                disabled={selectedBandaCodice === null || bande.isLoading}
                onClick={handleBandaSelect}
              >
                Continua
              </Button>
              <button
                type="button"
                onClick={() => setView("login")}
                className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                <ArrowLeft className="h-3 w-3" /> Torna al login
              </button>
            </CardContent>
          </>
        )}

        {/* ── REGISTRAZIONE: FORM ── */}
        {view === "register-form" && (
          <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl font-bold">Crea account</CardTitle>
              {selectedBanda && <CardDescription>{selectedBanda.descrizione}</CardDescription>}
            </CardHeader>
            {register.isSuccess ? (
              <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm">Registrazione completata! Puoi ora effettuare il login.</p>
                <Button
                  className="w-full"
                  onClick={() => {
                    setView("login")
                    register.reset()
                  }}
                >
                  Vai al login
                </Button>
              </CardContent>
            ) : (
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  {(regValidationError || register.isError) && (
                    <div
                      role="alert"
                      className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {regValidationError ??
                        getErrorMessage(register.error, "Errore durante la registrazione.")}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="reg-nome">
                      Nome completo <span className="text-muted-foreground">(opzionale)</span>
                    </Label>
                    <Input
                      id="reg-nome"
                      type="text"
                      autoComplete="name"
                      value={regNome}
                      onChange={(e) => setRegNome(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password-confirm">Conferma password</Label>
                    <Input
                      id="reg-password-confirm"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={regPasswordConfirm}
                      onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={register.isPending}>
                    {register.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrati
                  </Button>
                  <button
                    type="button"
                    onClick={() => setView("register-banda")}
                    className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    <ArrowLeft className="h-3 w-3" /> Cambia banda
                  </button>
                </CardContent>
              </form>
            )}
          </>
        )}
      </Card>

      {/* ── COPYRIGHT FOOTER ── */}
      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} BandApp — Developed by{" "}
        <a
          href="https://cosequences.com"
          className="underline underline-offset-2 hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cosequences.com
        </a>
      </p>
    </div>
  )
}
