import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Webhook } from "lucide-react"
import { CopyButton } from "@/components/copy-button"

export default function WebhookPage() {
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://beauty-salon-agenda.vercel.app"}/api/webhook/whatsapp`

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
          <CardTitle className="text-warning">⚠️ Validações Automáticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            O webhook valida automaticamente se o horário solicitado está <strong>disponível</strong> antes de criar o
            agendamento:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Verifica se o funcionário bloqueou aquele horário (horários indisponíveis)</li>
            <li>Verifica se já existe outro agendamento no mesmo horário</li>
            <li>Valida se o horário está dentro do expediente (08:00 às 20:00)</li>
            <li>Valida o formato da data (YYYY-MM-DD) e hora (HH:MM)</li>
          </ul>
          <p className="mt-3">
            Se alguma validação falhar, o webhook retorna um erro com a mensagem explicativa para o n8n processar.
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
              <span className="text-sm text-muted-foreground">Telefone com DDD (ex: (11) 99999-9999)</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <code className="font-mono text-sm font-semibold">data_agendamento</code>
              <span className="text-sm text-muted-foreground">Formato: YYYY-MM-DD (ex: 2025-01-20)</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <code className="font-mono text-sm font-semibold">hora_agendamento</code>
              <span className="text-sm text-muted-foreground">Formato: HH:MM (ex: 14:00) - Entre 08:00 e 19:59</span>
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
            <p>Crie um fluxo no n8n que receba mensagens do WhatsApp (use o nó WhatsApp Business ou Evolution API)</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              2
            </div>
            <p>
              Use IA (OpenAI, Groq, etc.) para extrair as informações da mensagem: nome, telefone, data, hora, serviço
              desejado
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              3
            </div>
            <p>Formate a data como YYYY-MM-DD e a hora como HH:MM (importante para validação)</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              4
            </div>
            <p>Adicione um nó HTTP Request configurado para POST na URL do webhook acima</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              5
            </div>
            <p>Configure o corpo da requisição com os dados extraídos no formato JSON (veja exemplo acima)</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              6
            </div>
            <p>Trate as respostas: sucesso (201) ou erro (400/409/500) para enviar mensagem apropriada ao cliente</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-xs">
              7
            </div>
            <p>O agendamento será criado com status "pendente" e pode ser confirmado/cancelado pelo admin ou staff</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Possíveis Erros</CardTitle>
          <CardDescription>Códigos de erro que o webhook pode retornar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 shrink-0">
              400
            </Badge>
            <div>
              <p className="font-semibold">Dados inválidos</p>
              <p className="text-muted-foreground">Campos obrigatórios faltando ou formato incorreto de data/hora</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 shrink-0">
              409
            </Badge>
            <div>
              <p className="font-semibold">Conflito de horário</p>
              <p className="text-muted-foreground">Horário bloqueado pelo funcionário ou já existe agendamento</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 shrink-0">
              500
            </Badge>
            <div>
              <p className="font-semibold">Erro interno</p>
              <p className="text-muted-foreground">Erro no servidor ou banco de dados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
