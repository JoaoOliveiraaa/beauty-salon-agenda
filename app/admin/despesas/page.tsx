"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, TrendingDown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Expense {
  id: string
  descricao: string
  valor: number
  categoria: string
  data: string
  observacoes?: string
}

const CATEGORIAS = [
  { value: "produtos", label: "Produtos" },
  { value: "energia", label: "Energia" },
  { value: "aluguel", label: "Aluguel" },
  { value: "agua", label: "Água" },
  { value: "internet", label: "Internet" },
  { value: "salarios", label: "Salários" },
  { value: "marketing", label: "Marketing" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outros", label: "Outros" },
]

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [period, setPeriod] = useState("30")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    categoria: "",
    data: new Date().toISOString().split("T")[0],
    observacoes: "",
  })

  useEffect(() => {
    fetchExpenses()
  }, [period])

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`/api/expenses?period=${period}`)
      if (!response.ok) throw new Error("Erro ao buscar despesas")
      const data = await response.json()
      setExpenses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[v0] Error fetching expenses:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as despesas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingExpense ? "/api/expenses" : "/api/expenses"
      const method = editingExpense ? "PUT" : "POST"
      const body = editingExpense ? { ...formData, id: editingExpense.id } : formData

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error("Erro ao salvar despesa")

      toast({
        title: "Sucesso",
        description: `Despesa ${editingExpense ? "atualizada" : "criada"} com sucesso`,
      })

      setDialogOpen(false)
      resetForm()
      fetchExpenses()
    } catch (error) {
      console.error("[v0] Error saving expense:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a despesa",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return

    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Erro ao deletar despesa")

      toast({
        title: "Sucesso",
        description: "Despesa excluída com sucesso",
      })

      fetchExpenses()
    } catch (error) {
      console.error("[v0] Error deleting expense:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a despesa",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      descricao: expense.descricao,
      valor: expense.valor.toString(),
      categoria: expense.categoria,
      data: expense.data,
      observacoes: expense.observacoes || "",
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingExpense(null)
    setFormData({
      descricao: "",
      valor: "",
      categoria: "",
      data: new Date().toISOString().split("T")[0],
      observacoes: "",
    })
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.valor, 0)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Despesas</h1>
          <p className="text-sm text-muted-foreground">Gerencie os custos operacionais do salão</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingExpense ? "Atualizar" : "Criar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Total de Despesas</CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <span className="text-2xl font-bold">R$ {totalExpenses.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando despesas...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma despesa encontrada</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-sm">{new Date(expense.data).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-sm">
                      <div>{expense.descricao}</div>
                      {expense.observacoes && (
                        <div className="text-xs text-muted-foreground mt-0.5">{expense.observacoes}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {CATEGORIAS.find((c) => c.value === expense.categoria)?.label || expense.categoria}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">R$ {expense.valor.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
