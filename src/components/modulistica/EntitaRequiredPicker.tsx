import { Label } from "@/components/ui/label"

interface EntitaRequiredPickerProps {
  value: string[]
  onChange: (value: string[]) => void
}

const AVAILABLE_ENTITIES = ["socio", "esterno", "banda"] as const
const ENTITY_LABELS: Record<string, string> = {
  socio: "Socio",
  esterno: "Esterno",
  banda: "Banda",
}

export default function EntitaRequiredPicker({ value, onChange }: EntitaRequiredPickerProps) {
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
      <div className="space-y-2">
        {AVAILABLE_ENTITIES.map((entity) => (
          <div key={entity} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`entity-${entity}`}
              checked={value.includes(entity)}
              onChange={() => toggleEntity(entity)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor={`entity-${entity}`} className="text-sm cursor-pointer">
              {ENTITY_LABELS[entity]}
            </label>
          </div>
        ))}
      </div>
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">Seleziona almeno un'entità.</p>
      )}
    </div>
  )
}
