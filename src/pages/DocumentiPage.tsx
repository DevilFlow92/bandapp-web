import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DocumentiPage() {
  return (
    <div className="flex justify-center pt-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-xl">Documenti</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Sezione in costruzione
        </CardContent>
      </Card>
    </div>
  )
}
