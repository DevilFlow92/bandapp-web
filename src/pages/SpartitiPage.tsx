import { useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ExternalLink,
  FolderOpen,
  Music,
  Music2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import {
  useNomeParti,
  useDeleteNomeParte,
  useSpartiti,
  useDeleteSpartito,
  useLookupTipiSpartito,
  downloadDocumento,
} from "@/hooks/useSpartiti"
import { API_URL } from "@/lib/api"
import { useConfirm } from "@/hooks/useConfirm"
import { useBanda } from "@/context/BandaContext"
import type { NomeParte } from "@/types/spartito"
import {
  NuovaComposizioneDialog,
  ModificaComposizioneDialog,
  AggiuntaParteDialog,
} from "@/components/spartiti/ComposizioneDialogs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function isPreviewable(mimeType: string | undefined | null): boolean {
  if (!mimeType) return false
  return mimeType === "application/pdf" || mimeType.startsWith("image/")
}

const PAGE_SIZE = 12
const PAGE_SIZE_PARTI = 50
const ALL = "__all__"

function NomeParteDetail({ nomeParte, onBack }: { nomeParte: NomeParte; onBack: () => void }) {
  const { banda } = useBanda()
  const [partiPage, setPartiPage] = useState(1)
  const [aggiuntaOpen, setAggiuntaOpen] = useState(false)
  const deleteSpartito = useDeleteSpartito()
  const { data, isLoading } = useSpartiti(
    partiPage,
    PAGE_SIZE_PARTI,
    banda!.codice,
    undefined,
    undefined,
    nomeParte.id,
  )
  const totalPages = data?.meta.total_pages ?? 1

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Torna alle composizioni
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold">{nomeParte.nome}</h2>
          {nomeParte.tipo_spartito && (
            <Badge variant="secondary" className="ml-2">
              {nomeParte.tipo_spartito.descrizione}
            </Badge>
          )}
          {nomeParte.url_riferimento && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(nomeParte.url_riferimento!, "_blank")}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Ascolta / Guarda
            </Button>
          )}
          {nomeParte.documento_audio_id != null && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `${API_URL}/documenti/${nomeParte.documento_audio_id}/preview`,
                  "_blank",
                )
              }
            >
              <Music className="mr-1 h-3.5 w-3.5" /> Ascolta file
            </Button>
          )}
        </div>
        {nomeParte.note && <p className="text-sm text-muted-foreground">{nomeParte.note}</p>}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Parti</h3>
          <Button size="sm" onClick={() => setAggiuntaOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Aggiungi parte
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Strumento</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Collocazione</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (data?.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    <Music2 className="mx-auto mb-2 h-8 w-8" />
                    Nessuna parte caricata ancora. Aggiungi la prima parte con il pulsante qui
                    sopra.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.items ?? []).map((spartito) => {
                  const collocazione = [spartito.scaffale, spartito.ripiano, spartito.cartella]
                    .filter(Boolean)
                    .join(" / ")
                  return (
                    <TableRow key={spartito.id}>
                      <TableCell>
                        {spartito.strumento?.descrizione ?? "Partitura completa"}
                      </TableCell>
                      <TableCell>
                        {spartito.documento_id != null ? (
                          <span
                            className="max-w-xs truncate"
                            title={spartito.documento?.nome ?? undefined}
                          >
                            {spartito.documento?.nome ?? "File"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{collocazione || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isPreviewable(spartito.documento?.mime_type) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  `${API_URL}/documenti/${spartito.documento_id}/preview`,
                                  "_blank",
                                )
                              }
                              aria-label="Anteprima"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {spartito.documento_id != null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                downloadDocumento(spartito.documento_id!, spartito.documento?.nome)
                              }
                              aria-label="Scarica"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSpartito.mutate(spartito.id)}
                            aria-label="Elimina"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && (data?.items ?? []).length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Pagina {data?.meta.page ?? partiPage} di {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPartiPage((p) => Math.max(1, p - 1))}
                disabled={partiPage <= 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Precedente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPartiPage((p) => Math.min(totalPages, p + 1))}
                disabled={partiPage >= totalPages}
              >
                Successiva <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AggiuntaParteDialog
        open={aggiuntaOpen}
        onOpenChange={setAggiuntaOpen}
        nomeParte={nomeParte}
      />
    </div>
  )
}

export default function SpartitiPage() {
  const { banda } = useBanda()
  const confirm = useConfirm()
  const [selectedNomeParte, setSelectedNomeParte] = useState<NomeParte | null>(null)
  const [page, setPage] = useState(1)
  const [tipoFilter, setTipoFilter] = useState<number | undefined>(undefined)
  const [nuovaOpen, setNuovaOpen] = useState(false)
  const [modificaTarget, setModificaTarget] = useState<NomeParte | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const tipi = useLookupTipiSpartito()
  const deleteNomeParte = useDeleteNomeParte()
  const { data, isLoading } = useNomeParti(
    banda?.codice ?? 0,
    page,
    PAGE_SIZE,
    tipoFilter,
    debouncedSearch || undefined,
  )
  const totalPages = data?.meta.total_pages ?? 1

  if (selectedNomeParte) {
    return (
      <NomeParteDetail nomeParte={selectedNomeParte} onBack={() => setSelectedNomeParte(null)} />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Spartiti</h1>
        <Button onClick={() => setNuovaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuova composizione
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select
            value={tipoFilter !== undefined ? String(tipoFilter) : ALL}
            onValueChange={(v) => {
              setPage(1)
              setTipoFilter(v === ALL ? undefined : Number(v))
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti i tipi</SelectItem>
              {tipi.data?.map((t) => (
                <SelectItem key={t.codice} value={String(t.codice)}>
                  {t.descrizione}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Cerca composizione..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (data?.items ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
          <FolderOpen className="h-10 w-10" />
          <p>Nessuna composizione trovata.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(data?.items ?? []).map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedNomeParte(item)}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <CardTitle className="text-base leading-snug">{item.nome}</CardTitle>
                {item.tipo_spartito && (
                  <Badge variant="secondary" className="shrink-0">
                    {item.tipo_spartito.descrizione}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2 pb-2">
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Music2 className="h-4 w-4 shrink-0" />
                  {item.num_parti > 0 ? `${item.num_parti} parti` : "Nessuna parte"}
                </p>
                {item.url_riferimento && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(item.url_riferimento!, "_blank")
                    }}
                    title="Apri link esterno"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
                {item.documento_audio_id != null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(
                        `${API_URL}/documenti/${item.documento_audio_id}/preview`,
                        "_blank",
                      )
                    }}
                    title="Ascolta file audio"
                  >
                    <Music className="h-3.5 w-3.5" />
                  </Button>
                )}
                {item.note && (
                  <p className="truncate text-xs text-muted-foreground" title={item.note}>
                    {item.note}
                  </p>
                )}
              </CardContent>
              <CardFooter className="gap-2 pt-0" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" onClick={() => setModificaTarget(item)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Modifica
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Eliminare questo brano?",
                      description:
                        "Il brano e i relativi file collegati verranno eliminati definitivamente. L'operazione non è reversibile.",
                      variant: "destructive",
                    })
                    if (!ok) return
                    deleteNomeParte.mutate(item.id)
                  }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Elimina
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (data?.items ?? []).length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {data?.meta.page ?? page} di {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Successiva <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <NuovaComposizioneDialog open={nuovaOpen} onOpenChange={setNuovaOpen} />
      {modificaTarget && (
        <ModificaComposizioneDialog
          nomeParte={modificaTarget}
          open={Boolean(modificaTarget)}
          onOpenChange={(o) => {
            if (!o) setModificaTarget(null)
          }}
        />
      )}
    </div>
  )
}
