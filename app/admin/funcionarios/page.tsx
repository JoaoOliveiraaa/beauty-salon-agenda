import { getSupabaseServerClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Scissors } from "lucide-react"
import { EmployeeServicesDialog } from "@/components/employee-services-dialog"

async function getStaff() {
  const supabase = await getSupabaseServerClient()

  const { data: staff } = await supabase.from("users").select("*").order("nome", { ascending: true })

  if (!staff) return []

  // Fetch employee services for all staff
  const { data: employeeServices } = await supabase.from("funcionario_servicos").select(`
      funcionario_id,
      servico_id,
      servicos (
        id,
        nome_servico
      )
    `)

  // Map services to each employee
  const staffWithServices = staff.map((person) => ({
    ...person,
    funcionario_servicos: employeeServices?.filter((es) => es.funcionario_id === person.id) || [],
  }))

  return staffWithServices
}

async function getServices() {
  const supabase = await getSupabaseServerClient()
  const { data: services } = await supabase.from("servicos").select("*").order("nome_servico", { ascending: true })
  return services || []
}

export default async function FuncionariosPage() {
  const staff = await getStaff()
  const services = await getServices()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Funcionários</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie sua equipe e os serviços que cada um oferece</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((person) => (
          <Card key={person.id} className="border-border hover:shadow-sm transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-semibold truncate">{person.nome}</CardTitle>
                  <Badge variant="outline" className="mt-1.5 text-xs">
                    {person.tipo_usuario === "admin" ? "Administrador" : "Funcionário"}
                  </Badge>
                </div>
                <EmployeeServicesDialog
                  employeeId={person.id}
                  employeeName={person.nome}
                  allServices={services}
                  employeeServices={person.funcionario_servicos?.map((es: any) => es.servico_id) || []}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{person.email}</span>
              </div>
              {person.telefone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{person.telefone}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs font-medium mb-2 text-foreground">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Serviços Oferecidos</span>
                </div>
                {person.funcionario_servicos && person.funcionario_servicos.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {person.funcionario_servicos.map((es: any) => (
                      <Badge key={es.servico_id} variant="secondary" className="text-xs font-normal">
                        {es.servicos.nome_servico}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum serviço configurado</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
