# Guia de Deploy — Quem Produz

> Explicação tipo "criança de 5 anos". Vamos colocar o app no ar em 3 partes:
> **1) Backend no Railway** → **2) Frontend na Vercel** → **3) Domínio quemproduz.com**

---

## O que é cada coisa?

- **Backend** = o "cérebro" do app (servidor Express + banco de dados). Vai morar no **Railway**.
- **Frontend** = a "cara" do app (React, o que o usuário vê). Vai morar na **Vercel**.
- **Banco de dados** = onde os dados ficam guardados. Já está no **Supabase**.
- **Domínio** = `quemproduz.com`. Vamos apontar pra Vercel.

---

## PARTE 1 — Subir o Backend no Railway

### 1.1 — Criar conta
1. Vá em https://railway.app
2. Clique em **Login** → entre com sua conta do **GitHub**.
3. Aceite os termos.

### 1.2 — Subir o código pro GitHub (se ainda não está)
No terminal, dentro da pasta do projeto:
```bash
git add .
git commit -m "deploy: adiciona configs railway + vercel"
git push
```
Se ainda não tem repositório no GitHub, crie um em https://github.com/new e siga as instruções que ele dá.

### 1.3 — Criar o projeto no Railway
1. No Railway, clique **New Project** → **Deploy from GitHub repo**.
2. Autorize o Railway a ver seus repositórios.
3. Selecione o repositório do **Quem Produz**.
4. Railway vai começar o deploy automático. Vai falhar na primeira vez — é normal! Falta configurar as variáveis.

### 1.4 — Configurar as variáveis de ambiente (Environment Variables)
No Railway, clique no seu serviço → aba **Variables** → **Add Variable**. Adicione TODAS estas:

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | (pega no Supabase → Project Settings → Database → Connection String → URI, **modo "Transaction"**) |
| `DIRECT_URL` | (mesmo lugar, mas o **modo "Session"** — usado por migrações) |
| `JWT_SECRET` | Uma frase aleatória longa. Use https://1password.com/password-generator/ → 50 caracteres |
| `FRONTEND_URL` | `https://quemproduz.com,https://www.quemproduz.com` (depois que a Vercel estiver no ar) |
| `PORT` | (não precisa, Railway define sozinho) |

> **Onde achar `DATABASE_URL` e `DIRECT_URL` no Supabase:**
> Project Settings → Database → "Connection string" → escolha **URI**.
> - "Transaction" mode → cole em `DATABASE_URL`
> - "Session" mode → cole em `DIRECT_URL`
> - Substitua `[YOUR-PASSWORD]` pela senha do banco que você definiu quando criou o projeto.

### 1.5 — Redeploy
Depois de salvar as variáveis, clique em **Deployments** → **Redeploy**. Vai funcionar.

### 1.6 — Pegar a URL pública do backend
1. No Railway, clique no serviço → aba **Settings** → **Networking** → **Generate Domain**.
2. Vai gerar algo tipo `quemproduz-production.up.railway.app`.
3. **Anote essa URL.** Vamos usar no próximo passo.

### 1.7 — Testar
Abra no navegador: `https://SUA-URL-DO-RAILWAY/api/health`
Tem que aparecer um JSON do tipo `{"ok":true}`. Se aparecer, o backend está vivo. ✅

---

## PARTE 2 — Subir o Frontend na Vercel

### 2.1 — Criar conta
1. Vá em https://vercel.com
2. **Sign Up** → entre com **GitHub**.

### 2.2 — Importar o projeto
1. Clique **Add New** → **Project**.
2. Selecione o mesmo repositório do GitHub.
3. **Framework Preset**: Vercel detecta **Vite** automaticamente.
4. **Build Command**: `npm run build` (já vem certo).
5. **Output Directory**: `dist` (já vem certo).

### 2.3 — Adicionar variável de ambiente do frontend
Antes de clicar Deploy, expanda **Environment Variables** e adicione:

| Nome | Valor |
|------|-------|
| `VITE_API_URL` | `https://SUA-URL-DO-RAILWAY` (a URL que você anotou no passo 1.6, **sem `/` no final**) |

### 2.4 — Deploy
Clique **Deploy**. Espera 1-2 minutos. Pronto. ✅
Vercel vai te dar uma URL tipo `quem-produz.vercel.app`. Já dá pra testar.

### 2.5 — Voltar ao Railway e atualizar `FRONTEND_URL`
No Railway → Variables → edite `FRONTEND_URL` e adicione a URL da Vercel também (separe com vírgula).
Exemplo: `https://quem-produz.vercel.app,https://quemproduz.com,https://www.quemproduz.com`
Salve → Redeploy.

---

## PARTE 3 — Apontar o domínio quemproduz.com

### 3.1 — Onde você comprou o domínio?
Entre no painel do **registrador** (GoDaddy, Registro.br, Namecheap, Hostinger, etc.). Procure a seção **DNS** ou **Gerenciar DNS** ou **Zona DNS**.

### 3.2 — Configurar na Vercel primeiro
1. No projeto da Vercel → **Settings** → **Domains** → digite `quemproduz.com` → **Add**.
2. Adicione também `www.quemproduz.com`.
3. Vercel vai mostrar os registros DNS que você precisa criar. Geralmente:
   - **Tipo A** | Nome `@` | Valor `76.76.21.21`
   - **Tipo CNAME** | Nome `www` | Valor `cname.vercel-dns.com`

### 3.3 — Criar os registros no registrador
No painel DNS do seu registrador:
1. **Apague** registros A/CNAME antigos do `@` e do `www` (se tiver).
2. **Crie** os registros que a Vercel pediu.
3. Salve.

### 3.4 — Esperar
DNS demora **de 10 minutos a 24 horas** pra propagar. Geralmente leva ~30 min.
Pra testar: https://dnschecker.org → digite `quemproduz.com`.

### 3.5 — Quando o domínio funcionar
- Vercel vai gerar SSL automaticamente (cadeado verde 🔒).
- Acesse `https://quemproduz.com` → o app aparece.
- Teste cadastro/login → tudo deve funcionar.

---

## Checklist final ✅

- [ ] Backend rodando no Railway (`/api/health` retorna `{"ok":true}`)
- [ ] Variáveis no Railway: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `FRONTEND_URL`
- [ ] Frontend rodando na Vercel
- [ ] Variável na Vercel: `VITE_API_URL` aponta pro Railway
- [ ] DNS de `quemproduz.com` aponta pra Vercel
- [ ] Cadastro de usuário funciona ponta-a-ponta
- [ ] Usuário aparece no Supabase → tabela `users`
- [ ] Criar lote / upload de foto funcionam

---

## Quando der erro

**"CORS error" no console do navegador**
→ Faltou adicionar a URL do frontend em `FRONTEND_URL` no Railway. Adicione e redeploy.

**"Failed to fetch" / "Network error"**
→ `VITE_API_URL` na Vercel está errada. Confira se aponta pro Railway, sem `/` no final.

**Backend cai com "P1001: Can't reach database"**
→ `DATABASE_URL` errada. Volte ao Supabase, copie de novo a string de conexão Transaction mode.

**"Invalid `prisma.user.create()` invocation"**
→ Faltou rodar `npx prisma generate` no build. Confira que `railway.json` tem `buildCommand: npm install && npx prisma generate`.

**Domínio não funciona depois de 24h**
→ Erros comuns: deixou registro A antigo apontando pra outro IP, ou esqueceu de apagar registros conflitantes. Confira em https://dnschecker.org.

---

## ⚠️ Aviso importante sobre fotos

O Railway tem **disco efêmero** — toda vez que faz redeploy, a pasta `uploads/` é apagada. Isso significa:
- Fotos enviadas funcionam **enquanto o backend não reinicia**.
- Quando você faz um novo deploy, **as fotos somem**.

**Solução temporária**: as fotos também ficam salvas em base64 no localStorage do navegador do usuário, então a UI continua mostrando.

**Solução definitiva** (próximo passo depois do deploy estar estável): mover uploads pro **Supabase Storage** (já vem incluído no plano gratuito). Isso é uma mudança no `server/routes/photos.ts` — me avise quando quiser fazer.
