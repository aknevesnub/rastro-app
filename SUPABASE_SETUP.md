# Supabase — Setup completo

## ✅ Já feito

- Projeto criado: **`quem-produz`** (id: `fqothcujvenibpfrqdfc`)
- Região: **São Paulo** (`sa-east-1`)
- Custo: **$0/mês** (Free tier)
- Schema aplicado: 7 tabelas (users, lots, lot_photos, events, proposals, user_products, user_certs)
- RLS habilitada em todas as tabelas (deny-all para anon — backend usa service_role)
- Triggers `updated_at` automáticos

URL: https://fqothcujvenibpfrqdfc.supabase.co
Dashboard: https://supabase.com/dashboard/project/fqothcujvenibpfrqdfc

---

## 🔑 O que VOCÊ precisa fazer

### 1. Pegar a senha do Postgres
Quando você criou o projeto, você definiu uma senha do banco. Se esqueceu:
- Dashboard → Settings → Database → "Reset database password"

### 2. Pegar a connection string
- Dashboard → Settings → Database → "Connection string"
- Aba **URI**, modo **Transaction pooler** (porta 6543)
- Cole no `.env` em `DATABASE_URL` (substitui `SUA_SENHA_AQUI`)

### 3. Pegar a service_role key
- Dashboard → Settings → API → "Project API keys"
- Copie a key **`service_role`** (começa com `eyJ...`)
- Cole no `.env` em `SUPABASE_SERVICE_ROLE_KEY`

### 4. Gerar JWT_SECRET novo
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Cole no `.env` em `JWT_SECRET`.

### 5. Instalar dependências
```bash
cd "/Users/andreknoppdasneves/Downloads/zip (1)"
npm install
```

### 6. Gerar Prisma Client + sincronizar schema
```bash
npx prisma generate
npx prisma db pull       # OU: npx prisma migrate deploy se preferir versionado
```

> **Atenção:** as tabelas no Supabase usam `snake_case` (users, lot_photos), o Prisma schema atual usa `camelCase` (User, LotPhoto). O `db pull` vai gerar o mapeamento `@map("users")` automaticamente.

### 7. Criar bucket de fotos (Storage)
- Dashboard → Storage → "New bucket"
- Nome: `photos`
- Public bucket: ✅ marcado
- Salvar

### 8. Subir o backend
```bash
npm run server
```
Backend Express vai rodar em `http://localhost:4000`.

### 9. Subir o frontend
```bash
npm run dev
```
Frontend em `http://localhost:3000` — agora conectado ao backend (que conecta no Supabase).

---

## 🔍 Como verificar se funcionou

### Backend conectado ao Postgres
```bash
curl http://localhost:4000/api/health
# → {"ok":true,"env":"development"}

curl http://localhost:4000/api/farms
# → []  (lista vazia, mas sem erro = conectou)
```

### Criar conta via API
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@quemproduz.com","password":"senha123","farmName":"Fazenda Teste"}'
# → {"token":"eyJ...","user":{...}}
```

### Verificar no Supabase
- Dashboard → Table Editor → `users` → linha criada com email/farm_name

---

## 🚀 Roadmap pós-setup

1. **Refatorar `AppContext`** em [src/App.tsx](src/App.tsx:514) para chamar `src/services/api.ts` em vez de `localStorage`
2. **Substituir uploads de foto** para usar `uploadPhoto()` de [src/services/supabase.ts](src/services/supabase.ts:32)
3. **Implementar Stripe** em [src/services/payment.ts](src/services/payment.ts:50) (skeleton já existe)
4. **Deploy:**
   - Frontend → Vercel (apontar `VITE_API_URL` para o backend público)
   - Backend → Railway/Render (variáveis do `.env` no painel)
   - Banco → Supabase (já está)
