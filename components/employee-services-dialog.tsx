"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface EmployeeServicesDialogProps {
  employeeId: string
  employeeName: string
  allServices: Array<{ id: string; nome_servico: string }>
  employeeServices: string[]
}

export function EmployeeServicesDialog({
  employeeId,
  employeeName,
  allServices,
  employeeServices,
}: EmployeeServicesDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>(employeeServices)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleToggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/employee-services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          serviceIds: selectedServices,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao atualizar serviços")
      }

      toast({
        title: "Sucesso!",
        description: "Serviços atualizados com sucesso",
      })

      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error("[v0] Error updating employee services:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar serviços",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Serviços de {employeeName}</DialogTitle>
          <DialogDescription>Selecione os serviços que este funcionário pode realizar</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {allServices.map((service) => (
            <div key={service.id} className="flex items-center space-x-2">
              <Checkbox
                id={service.id}
                checked={selectedServices.includes(service.id)}
                onCheckedChange={() => handleToggleService(service.id)}
              />
              <Label htmlFor={service.id} className="text-sm font-normal cursor-pointer flex-1">
                {service.nome_servico}
              </Label>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
