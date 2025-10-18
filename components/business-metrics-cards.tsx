"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, XCircle, Clock, Calendar } from "lucide-react"

interface BusinessMetrics {
  metrics: {
    clientes_atendidos: number
    total_atendimentos: number
    ticket_medio: number
    total_cancelamentos: number
    taxa_cancelamento: number
  }
  peakHours: Array<{ hora: number; total: number }>
  peakDays: Array<{ dia_semana: string; total: number }>
}

export function BusinessMetricsCards() {
  const [data, setData] = useState<BusinessMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch("/api/reports/business-metrics")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("[v0] Error fetching business metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return <div className="text-sm text-muted-foreground">Carregando métricas...</div>
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Clientes Atendidos</CardTitle>
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{data.metrics.clientes_atendidos}</div>
          <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Ticket Médio</CardTitle>
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">R$ {Number(data.metrics.ticket_medio).toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Por atendimento</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Taxa de Cancelamento</CardTitle>
          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{data.metrics.taxa_cancelamento || 0}%</div>
          <p className="text-xs text-muted-foreground">{data.metrics.total_cancelamentos} cancelamentos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Horário de Pico</CardTitle>
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{data.peakHours[0]?.hora}:00h</div>
          <p className="text-xs text-muted-foreground">{data.peakHours[0]?.total} atendimentos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Dia Mais Movimentado</CardTitle>
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{data.peakDays[0]?.dia_semana}</div>
          <p className="text-xs text-muted-foreground">{data.peakDays[0]?.total} atendimentos</p>
        </CardContent>
      </Card>
    </div>
  )
}
