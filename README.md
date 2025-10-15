# Agende Beauty - Sistema de Agendamentos

Sistema completo de gerenciamento de agendamentos para salão de beleza com integração WhatsApp via n8n.

## Funcionalidades

### Autenticação
- Login com email e senha (senhas em texto plano para desenvolvimento)
- Dois tipos de usuário: Admin e Funcionário
- Proteção de rotas com middleware

### Painel Admin
- Dashboard com estatísticas e agendamentos do dia
- Gerenciamento completo de agendamentos (visualizar, confirmar, cancelar)
- Exportação de agendamentos para CSV
- Gerenciamento de funcionários
- Gerenciamento de serviços
- Visualização de disponibilidades de todos os funcionários
- Criação manual de agendamentos com verificação de disponibilidade
- Integração WhatsApp via webhook

### Painel Funcionário
- Dashboard personalizado com seus agendamentos
- Visualização de todos os seus agendamentos
- Gerenciamento de disponibilidade (adicionar/remover horários)
- Criação de agendamentos para si mesmo

### Integração WhatsApp (n8n)
- Webhook endpoint para receber agendamentos via WhatsApp
- Criação automática de agendamentos com status "pendente"
- Busca inteligente de funcionários e serviços por nome
- Documentação completa no painel admin

## Estrutura do Banco de Dados

### Tabelas
1. **users** - Usuários do sistema (admin e funcionários)
2. **servicos** - Serviços oferecidos pelo salão
3. **disponibilidades** - Horários disponíveis dos funcionários
4. **agendamentos** - Agendamentos dos clientes

## Configuração

### Variáveis de Ambiente Necessárias
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_supabase
NEXT_PUBLIC_SITE_URL=https://seu-dominio.vercel.app
\`\`\`

### Instalação

1. **IMPORTANTE**: Se você já rodou scripts anteriores, limpe a tabela users primeiro:
   \`\`\`sql
   DELETE FROM users;
   \`\`\`

2. Execute os scripts SQL na ordem:
   - `scripts/01-create-tables.sql` - Cria as tabelas
   - `scripts/02-seed-data.sql` - Insere dados iniciais

3. Configure as variáveis de ambiente no Supabase

4. Faça deploy na Vercel

### Credenciais Padrão
- **Admin**: admin@agendebeauty.com / **admin123**
- **Funcionário 1**: maria@agendebeauty.com / senha123
- **Funcionário 2**: ana@agendebeauty.com / senha123

## Integração n8n

### Endpoint do Webhook
\`\`\`
POST /api/webhook/whatsapp
\`\`\`

### Payload Obrigatório
\`\`\`json
{
  "cliente_nome": "João Silva",
  "cliente_telefone": "(11) 99999-9999",
  "data_agendamento": "2025-01-20",
  "hora_agendamento": "14:00"
}
\`\`\`

### Payload Opcional
\`\`\`json
{
  "funcionario_nome": "Maria",
  "funcionario_id": "uuid",
  "servico_nome": "Corte",
  "servico_id": "uuid"
}
\`\`\`

## Tecnologias

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **UI**: shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Autenticação Customizada com Cookies (senhas em texto plano)
- **Deploy**: Vercel

## Status dos Agendamentos

- **Pendente** (Amarelo) - Aguardando confirmação
- **Confirmado** (Verde) - Confirmado pelo admin/funcionário
- **Cancelado** (Vermelho) - Cancelado

## Troubleshooting

### Não consigo fazer login
1. Verifique se você executou os scripts 01 e 02 no Supabase
2. Se já executou scripts anteriores, limpe a tabela users: `DELETE FROM users;`
3. Execute o script 02 novamente para inserir os usuários com as senhas corretas
4. Use as credenciais: admin@agendebeauty.com / admin123

## Suporte

Para dúvidas ou problemas, entre em contato com o administrador do sistema.
