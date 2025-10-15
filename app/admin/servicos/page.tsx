"use client"

import type React from "react"

import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Clock, DollarSign, Plus, Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Service {
  id: string
  nome_servico: string
  descricao: string | null
  preco: number
  duracao_minutos: number
}

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    nome_servico: "",
    descricao: "",
    preco: "",
    duracao_minutos: "",
  })
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Load services
  useState(() => {
    loadServices()
  })

  async function loadServices() {
    const { data } = await supabase.from("servicos").select("*").order("nome_servico", { ascending: true })
    setServices(data || [])
    setLoading(false)
  }

  function openCreateDialog() {
    setEditingService(null)
    setFormData({ nome_servico: "", descricao: "", preco: "", duracao_minutos: "" })
    setDialogOpen(true)
  }

  function openEditDialog(service: Service) {
    setEditingService(service)
    setFormData({
      nome_servico: service.nome_servico,
      descricao: service.descricao || "",
      preco: service.preco.toString(),
      duracao_minutos: service.duracao_minutos.toString(),
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const serviceData = {
      nome_servico: formData.nome_servico,
      descricao: formData.descricao || null,
      preco: Number.parseFloat(formData.preco),
      duracao_minutos: Number.parseInt(formData.duracao_minutos),
    }

    if (editingService) {
      await supabase.from("servicos").update(serviceData).eq("id", editingService.id)
    } else {
      await supabase.from("servicos").insert(serviceData)
    }

    setDialogOpen(false)
    loadServices()
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return

    setLoading(true)
    await supabase.from("servicos").delete().eq("id", id)
    loadServices()
  }

  if (loading && services.length === 0) {
    return <div className="p-8">Carregando...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Serviços</h1>
          <p className="text-muted-foreground mt-1">Gerencie os serviços oferecidos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background">
            <DialogHeader>
              <DialogTitle>{editingService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_servico">Nome do Serviço</Label>
                <Input
                  id="nome_servico"
                  value={formData.nome_servico}
                  onChange={(e) => setFormData({ ...formData, nome_servico: e.target.value })}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco">Preço (R$)</Label>
                  <Input
                    id="preco"
                    type="number"
                    step="0.01"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duracao_minutos">Duração (min)</Label>
                  <Input
                    id="duracao_minutos"
                    type="number"
                    value={formData.duracao_minutos}
                    onChange={(e) => setFormData({ ...formData, duracao_minutos: e.target.value })}
                    required
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingService ? "Salvar" : "Criar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card key={service.id} className="shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg text-balance">{service.nome_servico}</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEditDialog(service)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(service.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {service.descricao && <p className="text-sm text-muted-foreground mt-2">{service.descricao}</p>}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="font-semibold">R$ {service.preco.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{service.duracao_minutos} min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
