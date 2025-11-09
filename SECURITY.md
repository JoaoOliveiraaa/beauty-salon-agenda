# Documentação de Segurança

## ✅ Melhorias de Segurança Implementadas

### 1. **Autenticação do Webhook**
- ✅ Webhook do WhatsApp agora requer autenticação via API key
- ✅ Header: `x-api-key` ou `Authorization: Bearer <token>`
- ✅ Configure a variável `WEBHOOK_API_KEY` no `.env`

**Como gerar uma API key segura:**
```bash
openssl rand -hex 32
```

### 2. **Rate Limiting**
- ✅ Login: 5 tentativas por minuto por IP
- ✅ Webhook: 30 requisições por minuto por IP
- ✅ Proteção contra ataques de força bruta

### 3. **Validação e Sanitização de Dados**
- ✅ Validação de UUIDs
- ✅ Validação de emails
- ✅ Validação de telefones brasileiros
- ✅ Validação de datas e horários
- ✅ Sanitização de strings para prevenir SQL injection
- ✅ Limites de tamanho para todos os campos

### 4. **Logging Seguro**
- ✅ Logs sensíveis apenas em desenvolvimento
- ✅ Erros genéricos em produção
- ✅ Não expõe stack traces ou dados internos

### 5. **Controle de Acesso**
- ✅ Verificação de permissões em todas as rotas
- ✅ Funcionários só podem acessar seus próprios dados
- ✅ Admins têm acesso total
- ✅ Mensagens de erro genéricas para não expor existência de recursos

### 6. **Criptografia de Senhas**
- ✅ Suporte a bcrypt para senhas com hash
- ✅ Comparação segura de senhas
- ✅ Fallback para texto plano (remover em produção)

### 7. **Proteção de Sessão**
- ✅ Cookies httpOnly
- ✅ Cookies secure em produção
- ✅ SameSite: lax
- ✅ Expiração de 7 dias

## ⚠️ Ações Necessárias para Produção

### 1. Configurar API Key do Webhook
```bash
# Adicione ao .env ou variáveis de ambiente da Vercel
WEBHOOK_API_KEY=sua_chave_super_secreta_aqui
```

### 2. Atualizar n8n para Usar Autenticação
No seu workflow n8n, adicione o header:
```
x-api-key: sua_chave_super_secreta_aqui
```

### 3. Migrar Senhas para Bcrypt
As senhas em texto plano devem ser migradas para bcrypt:

```sql
-- Script SQL para atualizar senhas (executar com cuidado!)
-- Primeiro, instale a extensão pgcrypto se ainda não tiver:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atualizar todas as senhas para bcrypt
-- ATENÇÃO: Isso irá criptografar as senhas existentes
-- As senhas atuais serão usadas como texto plano
UPDATE users 
SET senha = crypt(senha, gen_salt('bf', 12))
WHERE senha NOT LIKE '$2a$%' AND senha NOT LIKE '$2b$%';
```

**Melhor prática:** Resetar todas as senhas e forçar os usuários a criarem novas.

### 4. Implementar Rate Limiting em Produção
O rate limiting atual é em memória. Para produção, recomenda-se usar Redis:

```typescript
// Exemplo com Redis (necessário instalar ioredis)
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function checkRateLimitRedis(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): Promise<boolean> {
  const key = `ratelimit:${identifier}`
  const count = await redis.incr(key)
  
  if (count === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000))
  }
  
  return count <= maxRequests
}
```

### 5. Configurar CORS Apropriadamente
Adicione ao `next.config.mjs`:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://seu-dominio.com" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS,PATCH" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-api-key" },
        ],
      },
    ]
  },
}
```

### 6. Habilitar HTTPS
Certifique-se de que o site está rodando em HTTPS (Vercel faz isso automaticamente).

### 7. Configurar CSP (Content Security Policy)
Adicione headers de segurança:

```javascript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ]
  },
}
```

## 🔒 Boas Práticas

### 1. Nunca commite secrets no Git
- ✅ Use `.env.local` para desenvolvimento
- ✅ Configure variáveis de ambiente na Vercel
- ✅ `.env.example` está versionado (sem valores reais)

### 2. Rotação Regular de Chaves
- 🔄 Troque a `WEBHOOK_API_KEY` regularmente
- 🔄 Rotacione o `SUPABASE_SERVICE_ROLE_KEY` periodicamente

### 3. Monitore Logs de Segurança
- 📊 Configure alertas para múltiplas tentativas de login falhadas
- 📊 Monitore requisições suspeitas ao webhook
- 📊 Revise logs regularmente

### 4. Backups Regulares
- 💾 Configure backups automáticos do Supabase
- 💾 Teste a restauração de backups periodicamente

### 5. Atualizações de Dependências
```bash
# Verificar vulnerabilidades
npm audit

# Atualizar dependências com cuidado
npm update
```

## 📝 Checklist de Deploy em Produção

- [ ] Configurar `WEBHOOK_API_KEY`
- [ ] Atualizar workflow n8n com autenticação
- [ ] Migrar senhas para bcrypt
- [ ] Configurar Redis para rate limiting (opcional, mas recomendado)
- [ ] Configurar CORS apropriadamente
- [ ] Adicionar headers de segurança (CSP, HSTS, etc)
- [ ] Verificar que HTTPS está ativo
- [ ] Configurar backups automáticos
- [ ] Configurar alertas de segurança
- [ ] Testar todas as funcionalidades
- [ ] Fazer auditoria de segurança final

## 🚨 Resposta a Incidentes

Se detectar atividade suspeita:

1. **Imediatamente:**
   - Rotacione todas as API keys
   - Verifique logs de acesso
   - Bloqueie IPs suspeitos

2. **Investigação:**
   - Revise logs de auditoria
   - Identifique escopo do incidente
   - Documente achados

3. **Recuperação:**
   - Restaure de backup se necessário
   - Corrija vulnerabilidades
   - Notifique usuários afetados se aplicável

4. **Pós-Incidente:**
   - Atualize processos de segurança
   - Implemente monitoramento adicional
   - Treine equipe

## 📞 Contato

Para reportar vulnerabilidades de segurança, entre em contato com o administrador do sistema.

