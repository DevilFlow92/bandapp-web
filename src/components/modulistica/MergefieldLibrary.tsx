import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useMergefields } from "@/hooks/useMergefields"

interface MergefieldLibraryProps {
  onInsert: (chiave: string) => void
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function isValidMergefieldsData(
  data: unknown,
): data is Record<string, { chiave: string; etichetta: string }[]> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false
  return Object.values(data).every((campi) => Array.isArray(campi))
}

export default function MergefieldLibrary({ onInsert }: MergefieldLibraryProps) {
  const { data, isLoading, isError } = useMergefields()
  const [search, setSearch] = useState("")

  const hasInvalidData =
    !isLoading && !isError && data !== undefined && !isValidMergefieldsData(data)

  const groups = useMemo(() => {
    if (!data || !isValidMergefieldsData(data)) return []
    const query = search.trim().toLowerCase()
    return Object.entries(data)
      .map(([entita, campi]) => ({
        entita,
        campi: query
          ? campi.filter((campo) => campo.etichetta.toLowerCase().includes(query))
          : campi,
      }))
      .filter((gruppo) => gruppo.campi.length > 0)
  }, [data, search])

  const showError = isError || hasInvalidData

  return (
    <div className="flex h-full flex-col rounded-md border">
      <div className="border-b p-2">
        <Input
          placeholder="Cerca campo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-[500px] overflow-y-auto p-2">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {showError && (
          <p className="p-2 text-sm text-muted-foreground">
            Impossibile caricare i campi disponibili.
          </p>
        )}

        {!isLoading && !showError && groups.length === 0 && (
          <p className="p-2 text-sm text-muted-foreground">Nessun campo trovato.</p>
        )}

        {!isLoading &&
          !showError &&
          groups.map(({ entita, campi }) => (
            <div key={entita} className="mb-3 last:mb-0">
              <h4 className="mb-1 px-1 text-xs font-semibold uppercase text-muted-foreground">
                {capitalize(entita)}
              </h4>
              <div className="flex flex-col gap-0.5">
                {campi.map((campo) => (
                  <button
                    key={campo.chiave}
                    type="button"
                    onClick={() => onInsert(campo.chiave)}
                    className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    title={campo.chiave}
                  >
                    {campo.etichetta}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
