"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp } from "lucide-react"

interface ServicePerformance {
  id: string
  nome_servico: string
  preco: number
  total_vendas: number
  receita_total: number
  cancelamentos: number
  taxa_conversao: number
}

export function ServicePerformanceTable() {
  const [data, setData] = useState<ServicePerformance[]>([])
  const [period, setPeriod] = useState("month")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/service-performance?period=${period}`)
      const result = await response.json()

      if (Array.isArray(result)) {
        setData(result)
      } else {
        console.error("[v0] Error: API returned non-array data:", result)
        setData([])
      }
    } catch (error) {
      console.error("[v0] Error fetching service performance:", error)
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
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Desempenho de Serviços</CardTitle>
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
                <TableHead className="text-xs">Serviço</TableHead>
                <TableHead className="text-xs text-right">Vendas</TableHead>
                <TableHead className="text-xs text-right">Receita</TableHead>
                <TableHead className="text-xs text-right">Conversão</TableHead>
                <TableHead className="text-xs text-right">Cancelamentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="text-sm font-medium">{service.nome_servico}</TableCell>
                  <TableCell className="text-sm text-right">{service.total_vendas}</TableCell>
                  <TableCell className="text-sm text-right text-green-600">
                    R$ {Number(service.receita_total).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-right">{service.taxa_conversao || 0}%</TableCell>
                  <TableCell className="text-sm text-right text-red-600">{service.cancelamentos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
