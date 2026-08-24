import { ChevronLeft, ChevronRight } from "lucide-react"
import type { PageMeta } from "@/types/scheda_alunno"
import type { SchedaAlunnoVoceStoricoResponse } from "@/types/scheda_alunno_voce_storico"
import type { StatoVoceProgramma } from "@/types/scheda_alunno_voce"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const STATO_LABELS: Record<StatoVoceProgramma, string> = {
  da_iniziare: "Da iniziare",
  in_corso: "In corso",
  acquisita: "Acquisita",
}

interface StoricoVociLogProps {
  storico: SchedaAlunnoVoceStoricoResponse[]
  meta: PageMeta | undefined
  isLoading: boolean
  isError: boolean
  page: number
  onPageChange: (page: number) => void
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })
}

function personaFullName(persona: { nome: string | null; cognome: string | null } | null): string {
  if (!persona) return "—"
  return `${persona.nome ?? ""} ${persona.cognome ?? ""}`.trim() || "—"
}

/** Sola lettura: consultazione dello storico append-only delle voci di programma. */
export default function StoricoVociLog({
  storico,
  meta,
  isLoading,
  isError,
  page,
  onPageChange,
}: StoricoVociLogProps) {
  const totalPages = meta?.total_pages ?? 1

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-destructive">Errore nel caricamento dello storico.</p>
  }

  if (storico.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna modifica registrata.</p>
  }

  return (
    <div className="space-y-3">
      {storico.map((riga) => (
        <div key={riga.id} className="space-y-1 rounded-md border p-3 text-sm">
          <p className="font-medium">{riga.voce_testo ?? "Voce non più disponibile"}</p>
          <p className="text-muted-foreground">
            {riga.stato_precedente ? STATO_LABELS[riga.stato_precedente] : "—"} →{" "}
            {STATO_LABELS[riga.stato_nuovo]}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatData(riga.data_modifica)} · {personaFullName(riga.modificato_da)}
          </p>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Pagina {meta?.page ?? page} di {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Precedente
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Successiva
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
