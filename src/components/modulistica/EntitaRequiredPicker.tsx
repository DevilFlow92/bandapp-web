import { useMergefields } from "@/hooks/useMergefields"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

interface EntitaRequiredPickerProps {
  value: string[]
  onChange: (value: string[]) => void
}

const ENTITY_LABELS: Record<string, string> = {
  socio: "Socio",
  esterno: "Esterno",
  banda: "Banda",
  contatto: "Contatto",
  iscrizione: "Iscrizione",
  servizio: "Servizio",
  ricevuta: "Ricevuta",
}

function entityLabel(entity: string) {
  return ENTITY_LABELS[entity] ?? entity.charAt(0).toUpperCase() + entity.slice(1)
}

export default function EntitaRequiredPicker({ value, onChange }: EntitaRequiredPickerProps) {
  const { data, isLoading, isError } = useMergefields()
  const availableEntities = data ? Object.keys(data) : []

  function toggleEntity(entity: string) {
    if (value.includes(entity)) {
      onChange(value.filter((e) => e !== entity))
    } else {
      onChange([...value, entity])
    }
  }

  return (
    <div className="space-y-2">
      <Label>Entità richieste</Label>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      ) : (
        <div className="space-y-2">
          {availableEntities.map((entity) => (
            <div key={entity} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`entity-${entity}`}
                checked={value.includes(entity)}
                onChange={() => toggleEntity(entity)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor={`entity-${entity}`} className="text-sm cursor-pointer">
                {entityLabel(entity)}
              </label>
            </div>
          ))}
        </div>
      )}
      {isError && (
        <p className="text-xs text-muted-foreground">Impossibile caricare le entità disponibili.</p>
      )}
      {!isLoading && value.length === 0 && (
        <p className="text-xs text-muted-foreground">Seleziona almeno un'entità.</p>
      )}
    </div>
  )
}
