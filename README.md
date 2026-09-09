# Auxilar de Vagas

Pesquisa de emprego em Moçambique, Angola e Portugal.

## Publicar no Netlify

1. Crie um projecto no [Supabase](https://supabase.com) (Postgres).
2. No SQL Editor, execute as migrações da pasta `migrations/` por ordem (`0001` … `0016`).
3. No Netlify: **Add new site → Import from Git** e escolha este repositório.
4. Variáveis de ambiente (ver `env.example`):
   - `DATABASE_URL` — connection string do Supabase (modo **session/pooler**)
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY`
   - `VITE_AUTH_ENABLED=true`
   - `BETTER_AUTH_URL` — URL pública do site Netlify
   - `BETTER_AUTH_SECRET` — chave longa aleatória
   - `RESEND_API_KEY` + `MAIL_FROM` — para o e-mail de boas-vindas ao criar conta
5. Deploy.

Quando uma pessoa cria conta, o site envia um e-mail de boas-vindas (Resend). O mesmo serviço de e-mail pode ser ligado no Supabase em **Authentication → SMTP Settings**.

## Desenvolvimento

```bash
npm install
npm run dev
```
