import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Webhook } from "lucide-react"
import { CopyButton } from "@/components/copy-button"

export default function WebhookPage() {
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.vercel.app"}/api/webhook/whatsapp`

  const examplePayload = {
    cliente_nome: "João Silva",
    cliente_telefone: "(11) 99999-9999",
    funcionario_nome: "Maria",
    servico_nome: "Corte de Cabelo",
    data_agendamento: "2025-01-20",
    hora_agendamento: "14:00",
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Integração WhatsApp</h1>
        <p className="text-muted-foreground mt-1">Configure o webhook do n8n para receber agendamentos via WhatsApp</p>
      </div>

      <Card className="shadow-sm border-warning/20 bg-warning/5">
        <CardHeader>
          <CardTitle className="text-warning">⚠️ Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Este sistema usa <strong>autenticação customizada</strong> com senhas em texto plano para facilitar o
            desenvolvimento.
          </p>
          <p>
            Os horários de disponibilidade agora funcionam como <strong>horários bloqueados</strong> - funcionários
            marcam quando NÃO estarão disponíveis.
          </p>
          <p>
            O webhook cria agendamentos automaticamente com status "pendente" que podem ser confirmados ou cancelados
            pelo admin ou staff.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Webhook className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>URL do Webhook</CardTitle>
              <CardDescription>Use esta URL no seu fluxo n8n</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border font-mono text-sm">
            <code className="flex-1 break-all">{webhookUrl}</code>
            <CopyButton text={webhookUrl} />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              POST
            </Badge>
            <span className="text-sm text-muted-foreground">Método HTTP</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Campos Obrigatórios</CardTitle>
          <CardDescription>Estes campos devem ser enviados no corpo da requisição</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <code className="font-mono text-sm font-semibold">cliente_nome</code>
              <span className="text-sm text-muted-foreground">Nome completo do cliente</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <code className="font-mono text-sm font-semibold">cliente_telefone</code>
              <span className="text-sm text-muted-foreground">Telefone com DDD</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <code className="font-mono text-sm font-semibold">data_agendamento</code>
              <span className="text-sm text-muted-foreground">Formato: YYYY-MM-DD</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <code className="font-mono text-sm font-semibold">hora_agendamento</code>
              <span className="text-sm text-muted-foreground">Formato: HH:MM</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Campos Opcionais</CardTitle>
          <CardDescription>Se não fornecidos, o sistema usará valores padrão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <code className="font-mono text-sm font-semibold">funcionario_nome</code>
              <span className="text-sm text-muted-foreground">Nome do funcionário (busca parcial)</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <code className="font-mono text-sm font-semibold">funcionario_id</code>
              <span className="text-sm text-muted-foreground">ID do funcionário (UUID)</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <code className="font-mono text-sm font-semibold">servico_nome</code>
              <span className="text-sm text-muted-foreground">Nome do serviço (busca parcial)</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <code className="font-mono text-sm font-semibold">servico_id</code>
              <span className="text-sm text-muted-foreground">ID do serviço (UUID)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Exemplo de Payload</CardTitle>
          <CardDescription>JSON para enviar no corpo da requisição POST</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="p-4 bg-secondary/50 rounded-lg border border-border overflow-x-auto">
              <code className="text-sm font-mono">{JSON.stringify(examplePayload, null, 2)}</code>
            </pre>
            <div className="absolute top-4 right-4">
              <CopyButton text={JSON.stringify(examplePayload, null, 2)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-primary">Como Configurar no n8n</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              1
            </div>
            <p>Crie um fluxo no n8n que receba mensagens do WhatsApp</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              2
            </div>
            <p>Extraia as informações do agendamento da mensagem (nome, telefone, data, hora, etc.)</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              3
            </div>
            <p>Adicione um nó HTTP Request configurado para POST na URL do webhook acima</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              4
            </div>
            <p>Configure o corpo da requisição com os dados extraídos no formato JSON</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              5
            </div>
            <p>O agendamento será criado automaticamente com status "pendente"</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              6
            </div>
            <p>
              O sistema verifica automaticamente se o horário está bloqueado (indisponível) ou já agendado antes de
              criar
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
