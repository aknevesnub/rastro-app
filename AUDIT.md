# Auditoria de Engenharia — Quem Produz
**Data:** 2026-04-25
**Engenheiro:** Claude Sonnet 4.6
**Escopo:** Segurança, Qualidade de Código, Roadmap para Produção

---

## 1. Achados e Correções Aplicadas

### CRÍTICO — PBKDF2 com salt global (CORRIGIDO)
**Antes:** Um único salt era gerado por *dispositivo* e armazenado em `localStorage("rastro_salt")`. Qualquer dois usuários no mesmo browser compartilhavam o salt. Um atacante com acesso ao localStorage poderia montar ataques de dicionário usando o salt exposto.

**Depois:** Cada senha é armazenada no formato `pbkdf2:<16-byte salt hex>:<32-byte hash hex>`. O salt é único por hash, gerado no momento do registro. Login usa `verifyPassword()` que extrai o salt embutido. Senhas legadas são migradas silenciosamente no próximo login.

**Arquivo:** `src/App.tsx` — funções `hashPassword` / `verifyPassword`

---

### ALTO — Upload de imagem sem validação de conteúdo (CORRIGIDO)
**Antes:** `server/routes/photos.ts` só verificava o `Content-Type` do header HTTP — que pode ser forjado por qualquer cliente.

**Depois:** Adicionada leitura dos **magic bytes** reais do arquivo em disco (JPEG `FF D8 FF`, PNG `89 50 4E 47…`, WebP `RIFF…WEBP`). Arquivo rejeitado é deletado imediatamente. Protege contra upload de SVG com XSS, HTML, executáveis disfarçados de imagem.

**Arquivo:** `server/routes/photos.ts` — função `checkMagicBytes`

---

### ALTO — Ausência de validação de tamanho em PUT /api/farms/me (CORRIGIDO)
**Antes:** Campos como `description`, `farmName`, `products[]` eram salvos sem limite de tamanho. Um atacante autenticado poderia gravar gigabytes no banco.

**Depois:** Limites aplicados server-side: farmName ≤ 100, name ≤ 100, phone ≤ 20, location ≤ 200, description ≤ 2000, products ≤ 20 itens, certs ≤ 20 itens.

**Arquivo:** `server/routes/farms.ts`

---

### ALTO — Plano nunca persistido no banco (CORRIGIDO)
**Antes:** Campo `plan` não existia no schema Prisma. O frontend lia plano do `localStorage` — qualquer usuário podia se autopromover para `pro`/`business` editando o localStorage.

**Depois:**
- `plan` e `isPublic` adicionados ao model `User` no schema Prisma
- PUT `/api/farms/me` **não aceita** `plan` — campo ignorado mesmo se enviado
- Nova rota `POST /api/webhook/payment` é a **única forma** de alterar plano, via assinatura validada do provedor de pagamento

**Arquivos:** `prisma/schema.prisma`, `server/routes/farms.ts`, `server/routes/webhook.ts`

---

### MÉDIO — isPublic não era filtrado na listagem pública (CORRIGIDO)
**Antes:** `GET /api/farms` retornava *todos* os usuários, independente de terem optado por privacidade.

**Depois:** Query inclui `where: { isPublic: true }`.

**Arquivo:** `server/routes/farms.ts`

---

### MÉDIO — Rate limit server-side em auth (já estava ok)
`server/index.ts` usa `express-rate-limit` com janela 15 min / 20 tentativas para `/api/auth`. O frontend também tem rate limit em memória (5 tentativas / 60s). Ambas as camadas são necessárias — a do frontend é UI/UX, a do servidor é a real.

---

### BAIXO — CORS em produção
Atualmente `FRONTEND_URL` aceita múltiplas origens via vírgula. Garantir que em produção **apenas** o domínio do Vercel seja permitido. Nunca usar `origin: "*"` com `credentials: true`.

---

### BAIXO — JWT expira em 30 dias (aceitável para MVP)
Para produção, considerar: access token de 15 min + refresh token de 30 dias com rotação (implementação já presente em `/api/auth/refresh`).

---

### INFORMATIVO — Uploads locais em disco
`/uploads` é servido como static. Em produção mover para **Cloudflare R2** ou **AWS S3** e remover `express.static("/uploads")`. O código já tem comentário de TODO neste ponto.

---

## 2. O que já estava bem

| Item | Status |
|---|---|
| Helmet (security headers) | ✅ |
| CORS restrito por env | ✅ |
| Rate limiting no servidor | ✅ |
| bcrypt no server (12 rounds) | ✅ |
| JWT Bearer token | ✅ |
| HTML escaping no relatório EUDR (`esc()`) | ✅ |
| Validação de MIME no frontend | ✅ |
| Limit de 5MB e 10 fotos por lote | ✅ |
| LGPD — deleção em cascata (Prisma `onDelete: Cascade`) | ✅ |
| Prisma parametriza queries (sem SQL injection) | ✅ |
| Senha nunca exposta nas respostas (`select` sem `password`) | ✅ |
| Autoria de lote verificada antes de update/delete | ✅ |

---

## 3. Roadmap de Produção

### Fase 1 — Backend real (Supabase ou self-hosted Postgres)
```bash
# 1. Configure DATABASE_URL no .env com a URL do Supabase
# 2. Rode a migration
npx prisma migrate deploy

# 3. Gere o client
npx prisma generate
```
O código já está 100% compatível — basta apontar `DATABASE_URL`.

### Fase 2 — Deploy (Vercel + Railway/Render)
```
Frontend (Vite):  Vercel
Backend (Express): Railway ou Render
Database:          Supabase (Postgres gerenciado)
Storage:           Cloudflare R2 (substituir /uploads)
```

**Variáveis de ambiente necessárias no Vercel:**
```
VITE_API_URL=https://api.quemproduz.com.br
```

**Variáveis no Railway/Render:**
```
DATABASE_URL=...
JWT_SECRET=...
WEBHOOK_SECRET=...
FRONTEND_URL=https://quemproduz.com.br
API_URL=https://api.quemproduz.com.br
NODE_ENV=production
```

### Fase 3 — Stripe Payments
```
1. Crie produtos no Stripe Dashboard (Pro R$79/mês, Business R$199/mês)
2. Configure STRIPE_WEBHOOK_SECRET
3. Implemente StripePaymentService em src/services/payment.ts (skeleton já existe)
4. O webhook POST /api/webhook/payment já está pronto para receber eventos Stripe
```

### Fase 4 — Migração localStorage → Backend
A infra do servidor já existe completa (`src/services/api.ts`). Para ativar:
```env
VITE_API_URL=https://api.quemproduz.com.br
```
O `AppContext` em `App.tsx` precisará ser refatorado para usar `api.ts` em vez de `localStorage`.

---

## 4. Estratégia de Testes

### Antes de cada release
```bash
# Verificar tipos TypeScript (zero erros = pré-requisito)
npm run lint

# Testar build de produção
npm run build
```

### Testes manuais críticos (checklist antes de merge)
- [ ] Registro com email já cadastrado → erro 409
- [ ] Login com senha errada → erro + rate limit após 5 tentativas
- [ ] Upload de arquivo não-imagem → rejeitado pelo servidor
- [ ] Adicionar lote além do limite do plano → bloqueado
- [ ] Editar lote de outro usuário via API → 404
- [ ] GET /api/farms não retorna fazendas com `isPublic: false`
- [ ] PUT /api/farms/me com `plan: "pro"` no body → campo ignorado
- [ ] Relatório EUDR com caracteres especiais (`<script>`) → escapado

### Futuro: Testes automatizados recomendados
```
Vitest (unit)    → funções puras: hashPassword, verifyPassword, validateEmail, esc()
Supertest (API)  → todas as rotas com casos de sucesso e falha
Playwright (E2E) → fluxo completo: registro → criar lote → gerar QR → proposta
```

---

## 5. Regra de Ouro — Zero Trust

> "Nunca confie no Frontend, nem no Backender"

| Princípio | Implementação |
|---|---|
| Frontend nunca eleva plano | `plan` só muda via webhook validado |
| Frontend nunca bypassa autoria | Cada query filtra por `userId` do JWT |
| Content-Type não é confiável | Magic bytes verificados no servidor |
| JWT não é verificado no cliente | `authenticate` middleware em todas as rotas privadas |
| Inputs do usuário não são confiáveis | Validação de tamanho em todas as rotas |
| Senha nunca em plaintext | bcrypt (server) + PBKDF2 per-user salt (client offline) |
