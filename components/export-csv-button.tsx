"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useState } from "react"

interface ExportCSVButtonProps {
  startDate?: string
  endDate?: string
}

export function ExportCSVButton({ startDate, endDate }: ExportCSVButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const response = await fetch(`/api/reports/financial?${params.toString()}`)

      if (!response.ok) throw new Error("Erro ao gerar relatório")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `relatorio-financeiro-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[v0] Error exporting CSV:", error)
      alert("Erro ao exportar relatório")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={isExporting} variant="outline" size="sm" className="gap-2 bg-transparent">
      <Download className="w-4 h-4" />
      {isExporting ? "Exportando..." : "Exportar CSV"}
    </Button>
  )
}
