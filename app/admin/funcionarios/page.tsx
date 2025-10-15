import { getSupabaseServerClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone } from "lucide-react"

async function getStaff() {
  const supabase = await getSupabaseServerClient()

  const { data: staff } = await supabase.from("users").select("*").order("nome", { ascending: true })

  return staff || []
}

export default async function FuncionariosPage() {
  const staff = await getStaff()

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Funcionários</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua equipe</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((person) => (
          <Card key={person.id} className="shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{person.nome}</CardTitle>
                  <Badge variant="outline" className="mt-2">
                    {person.tipo_usuario === "admin" ? "Administrador" : "Funcionário"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{person.email}</span>
              </div>
              {person.telefone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{person.telefone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
