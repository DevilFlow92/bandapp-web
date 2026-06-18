import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Music } from "lucide-react"
import { useBande } from "@/hooks/useBande"
import { useBanda } from "@/context/BandaContext"
import type { Banda } from "@/types/banda"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function BandaSelectPage() {
  const navigate = useNavigate()
  const { setBanda } = useBanda()
  const { data: bande, isLoading } = useBande()

  const handleSelect = (banda: Banda) => {
    setBanda(banda)
    navigate("/", { replace: true })
  }

  // With a single banda there's nothing to choose: auto-select and redirect.
  const autoSelect = !isLoading && bande?.length === 1
  useEffect(() => {
    if (autoSelect && bande) {
      setBanda(bande[0])
      navigate("/", { replace: true })
    }
  }, [autoSelect, bande, setBanda, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            Seleziona la banda
          </CardTitle>
          <CardDescription>
            Scegli la banda con cui vuoi lavorare
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading || autoSelect ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))
          ) : !bande || bande.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessuna banda disponibile
            </p>
          ) : (
            bande.map((banda) => (
              <button
                key={banda.codice}
                type="button"
                onClick={() => handleSelect(banda)}
                className="flex w-full items-center gap-3 rounded-md border p-4 text-left text-sm font-medium transition-colors hover:border-primary hover:bg-accent"
              >
                <Music className="h-5 w-5 shrink-0 text-muted-foreground" />
                {banda.descrizione}
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
