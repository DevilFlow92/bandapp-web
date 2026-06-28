import { Construction } from "lucide-react"

interface UnderConstructionProps {
  pageName: string
}

export default function UnderConstruction({ pageName }: UnderConstructionProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center text-muted-foreground">
      <Construction className="w-12 h-12 text-orange-400" />
      <h2 className="text-xl font-semibold text-foreground">{pageName}</h2>
      <p className="text-sm">
        Pagina in costruzione.
        <br />
        Funzionalità disponibile a breve.
      </p>
    </div>
  )
}
