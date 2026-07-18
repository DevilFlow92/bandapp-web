import { useMemo } from "react"
import { useQueries } from "@tanstack/react-query"
import { useCurrentUser } from "@/hooks/useAuth"
import { useMacroSezioni, sottoCartelleQueryOptions } from "@/hooks/useArchivio"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CartellaOutputSelectorProps {
  value: number | null
  onChange: (sottoCartellaId: number | null) => void
}

const NONE_VALUE = "none"

/**
 * Lets the user pick which sotto-cartella dell'archivio documenti riceverà i
 * DOCX/PDF generati da questo modulo. Propone solo le macro-sezioni e
 * sotto-cartelle su cui l'utente ha il permesso di scrittura, altrimenti
 * potrebbe scegliere una destinazione dove poi non riuscirebbe a caricare.
 */
export default function CartellaOutputSelector({ value, onChange }: CartellaOutputSelectorProps) {
  const { data: user } = useCurrentUser()
  const hasPermission = (codice: string) =>
    user?.superuser === true || user?.permessi?.includes(codice) === true

  const { data: macroSezioni } = useMacroSezioni()

  const writableMacroSezioni = useMemo(
    () => (macroSezioni ?? []).filter((ms) => hasPermission(`${ms.permesso_prefisso}:write`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [macroSezioni, user],
  )

  const sottoCartelleQueries = useQueries({
    queries: writableMacroSezioni.map((ms) => sottoCartelleQueryOptions(ms.codice)),
  })

  const groups = writableMacroSezioni.map((ms, i) => ({
    macroSezione: ms,
    sottoCartelle: sottoCartelleQueries[i]?.data ?? [],
  }))

  return (
    <div className="space-y-2">
      <Label>Cartella di output</Label>
      <Select
        value={value != null ? String(value) : NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? null : Number(v))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Nessuna cartella (predefinito)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Nessuna cartella (predefinito)</SelectItem>
          {groups.map(
            ({ macroSezione, sottoCartelle }) =>
              sottoCartelle.length > 0 && (
                <SelectGroup key={macroSezione.codice}>
                  <SelectLabel>{macroSezione.nome}</SelectLabel>
                  {sottoCartelle.map((sc) => (
                    <SelectItem key={sc.id} value={String(sc.id)}>
                      {sc.nome}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ),
          )}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        I documenti generati da questo modulo verranno salvati in questa cartella
        dell&apos;archivio.
      </p>
    </div>
  )
}
