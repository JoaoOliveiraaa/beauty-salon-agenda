"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react"

interface ProfitData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  expensesByCategory: Record<string, number>
  dailyData: Array<{
    date: string
    revenue: number
    expenses: number
    profit: number
  }>
}

const COLORS = ["#f43f5e", "#ec4899", "#a855f7", "#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", "#06b6d4", "#14b8a6"]

const CATEGORIA_LABELS: Record<string, string> = {
  produtos: "Produtos",
  energia: "Energia",
  aluguel: "Aluguel",
  agua: "Água",
  internet: "Internet",
  salarios: "Salários",
  marketing: "Marketing",
  manutencao: "Manutenção",
  outros: "Outros",
}

export function ProfitAnalysisDashboard() {
  const [data, setData] = useState<ProfitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/reports/profit-analysis?period=${period}`)
      if (!response.ok) throw new Error("Erro ao buscar análise de lucro")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("[v0] Error fetching profit analysis:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return <div className="text-sm text-muted-foreground">Carregando análise de lucro...</div>
  }

  const expensesChartData = Object.entries(data.expensesByCategory).map(([categoria, valor]) => ({
    name: CATEGORIA_LABELS[categoria] || categoria,
    value: valor,
  }))

  const chartData = data.dailyData.map((day) => ({
    date: new Date(day.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    Receita: day.revenue,
    Despesas: day.expenses,
    Lucro: day.profit,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Análise de Lucro</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xl font-bold">R$ {data.totalRevenue.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Despesas Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xl font-bold">R$ {data.totalExpenses.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Lucro Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className={`h-4 w-4 ${data.netProfit >= 0 ? "text-green-500" : "text-red-500"}`} />
              <span className={`text-xl font-bold ${data.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                R$ {data.netProfit.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Margem de Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Percent className={`h-4 w-4 ${data.profitMargin >= 0 ? "text-green-500" : "text-red-500"}`} />
              <span className={`text-xl font-bold ${data.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                {data.profitMargin.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Receita vs Despesas (Últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="Receita" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="Lucro" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
