"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users } from "lucide-react"

interface EmployeeRevenue {
  id: string
  nome: string
  total_atendimentos: number
  faturamento_realizado: number
  faturamento_pendente: number
  cancelamentos: number
}

export function EmployeeRevenueTable() {
  const [data, setData] = useState<EmployeeRevenue[]>([])
  const [period, setPeriod] = useState("month")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/employee-revenue?period=${period}`)
      const result = await response.json()

      if (Array.isArray(result)) {
        setData(result)
      } else {
        console.error("[v0] Error: API returned non-array data:", result)
        setData([])
      }
    } catch (error) {
      console.error("[v0] Error fetching employee revenue:", error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Faturamento por Funcionário</CardTitle>
          </div>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="h-8">
              <TabsTrigger value="week" className="text-xs">
                7 dias
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs">
                30 dias
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                Tudo
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Funcionário</TableHead>
                <TableHead className="text-xs text-right">Atendimentos</TableHead>
                <TableHead className="text-xs text-right">Faturado</TableHead>
                <TableHead className="text-xs text-right">A Receber</TableHead>
                <TableHead className="text-xs text-right">Cancelamentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="text-sm font-medium">{employee.nome}</TableCell>
                  <TableCell className="text-sm text-right">{employee.total_atendimentos}</TableCell>
                  <TableCell className="text-sm text-right text-green-600">
                    R$ {Number(employee.faturamento_realizado).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-right text-amber-600">
                    R$ {Number(employee.faturamento_pendente).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-right text-red-600">{employee.cancelamentos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
