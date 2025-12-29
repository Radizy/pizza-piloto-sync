# 02_migracao_supabase_tutorial.md

Este arquivo explica **como migrar** o projeto para **SEU próprio projeto Supabase**:

1. Subir o banco (tabelas + colunas)
2. Aplicar as policies de RLS
3. Configurar variáveis de ambiente (credenciais)
4. Subir e configurar as Edge Functions

> Dica: faça tudo primeiro em um projeto de teste. Depois que estiver funcionando, repita em produção.

---

## 1. Criar seu projeto no Supabase

1. Crie uma conta no Supabase (se ainda não tiver).
2. Crie um **novo projeto** (anote:
   - `Project URL`
   - `anon public key` (chave pública)
   - `project ref` (ID do projeto, algo como `abcdxyz123`).
3. Aguarde o banco inicializar (até o painel mostrar que está pronto).

---

## 2. Subir o schema do banco

No painel do Supabase, vá em **SQL Editor** e siga em ordem:

### 2.1. Rodar 00_schema_estrutura.sql (estrutura + dados iniciais)

1. Abra o arquivo `db/00_schema_estrutura.sql` deste projeto.
2. Copie TODO o conteúdo.
3. No Supabase, vá em **SQL** → **New query**.
4. Cole o conteúdo de `00_schema_estrutura.sql`.
5. Clique em **Run**.
6. Verifique em **Table editor** se as tabelas foram criadas:
   - `franquias`
   - `unidades`
   - `entregadores`
   - `historico_entregas`
   - `global_config`
   - `system_config`
   - `planos`
   - `unidade_planos`
   - `franquia_bag_tipos`
   - `unidade_bag_tipos`
   - `logs_auditoria`
   - `system_users`
   - `user_unidades`

> O arquivo `00_schema_estrutura.sql` deste projeto já vem preparado para criar **toda a estrutura** e também popular as tabelas principais com os **dados atuais** usados neste ambiente. Rode-o apenas uma vez em um banco vazio.

### 2.2. Rodar 01_policies_rls.sql

1. Abra o arquivo `db/01_policies_rls.sql` deste projeto.
2. Copie TODO o conteúdo.
3. No Supabase, crie uma nova query SQL.
4. Cole o conteúdo de `01_policies_rls.sql`.
5. Clique em **Run**.
6. Em **Table editor** → clique em uma tabela → aba **RLS** para conferir se as policies apareceram.

> Atenção: essas policies são **bem permissivas** ("Anyone can ..."). Se quiser mais segurança depois, você pode endurecer as regras, mas para migração rápida isso ajuda a não travar o app.

---

## 3. Configurar as credenciais no front-end

No código deste projeto (Vite + React), já existe o cliente configurado em `src/integrations/supabase/client.ts`, usando variáveis de ambiente:

```ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

### 3.1. Atualizar o `.env` local

No seu ambiente de desenvolvimento, crie/edite um arquivo `.env` na raiz do projeto com:

```bash
VITE_SUPABASE_URL="https://SEU_PROJECT_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="SUA_ANON_PUBLIC_KEY"
VITE_SUPABASE_PROJECT_ID="SEU_PROJECT_REF"
```

Substitua pelos valores do SEU projeto:
- `SEU_PROJECT_REF`: o ID do projeto
- `SUA_ANON_PUBLIC_KEY`: a chave anônima pública (não use a service_role no front-end).

Depois disso, rode o projeto localmente:

```bash
npm install
npm run dev
```

Se o banco e as tabelas estiverem corretos, o app já deve conversar com o seu backend.

> Em produção (Vercel, Netlify ou outro), você precisa criar essas mesmas variáveis de ambiente na plataforma de deploy.

---

## 4. Edge Functions (send-webhook, send-whatsapp, reset-daily)

No projeto existem Edge Functions dentro da pasta `supabase/functions`:

- `supabase/functions/send-webhook/index.ts`
- `supabase/functions/send-whatsapp/index.ts`
- `supabase/functions/reset-daily/index.ts`

Você precisa **criar essas funções no seu projeto Supabase**.

### 4.1. Opção A – Usando Supabase CLI (recomendado)

1. Instale o Supabase CLI (veja a documentação oficial do Supabase).
2. No terminal, na raiz do projeto, rode:

```bash
npx supabase init
```

3. No arquivo `supabase/config.toml`, deixe assim (ajuste apenas o project_id):

```toml
project_id = "SEU_PROJECT_REF"

[functions.send-webhook]
verify_jwt = false

[functions.send-whatsapp]
verify_jwt = false

[functions.reset-daily]
verify_jwt = false
```

4. Faça login no CLI e vincule ao seu projeto (veja comandos `supabase login` e `supabase link` na doc oficial).

5. Deploy das funções (a partir da raiz do projeto):

```bash
npx supabase functions deploy send-webhook
npx supabase functions deploy send-whatsapp
npx supabase functions deploy reset-daily
```

O CLI vai enviar o conteúdo de cada pasta `supabase/functions/<nome>` para o seu projeto.

### 4.2. Opção B – Criar funções manualmente pelo painel

Se não quiser usar o CLI, você pode criar as funções manualmente:

1. No painel do Supabase, vá em **Edge Functions**.
2. Clique em **New Function** e crie:
   - `send-webhook`
   - `send-whatsapp`
   - `reset-daily`
3. Para cada uma, copie o conteúdo do respectivo `index.ts` deste projeto e cole no editor da função.
4. Salve e faça o deploy pelo painel.

> Importante: garanta que o **nome da função** é exatamente igual ao chamado no front-end (por exemplo, `send-whatsapp`).

---

## 5. Variáveis de ambiente das Edge Functions

Algumas funções podem precisar de variáveis de ambiente (por exemplo, chaves de API externas). No Supabase, você configura isso assim:

1. No painel, vá em **Edge Functions** → **Config** ou **Settings**.
2. Adicione variáveis como, por exemplo:
   - `SUPABASE_URL` – URL do seu projeto.
   - `SUPABASE_ANON_KEY` – anon key (quando necessário).
   - `SUPABASE_SERVICE_ROLE_KEY` – **apenas dentro das funções**, nunca no front.
   - Chaves de APIs externas (WhatsApp/Evolution, etc.).
3. Salve e faça o **redeploy** das funções.

As funções em Deno podem ler as variáveis com `Deno.env.get("NOME_DA_VARIAVEL")`.

---

## 6. Como o front chama as Edge Functions

No código, as chamadas são feitas usando o cliente já configurado, por exemplo:

```ts
import { supabase } from "@/integrations/supabase/client";

await supabase.functions.invoke("send-whatsapp", {
  body: {
    telefone,
    message,
    unidade_id,
    franquia_id,
  },
});
```

Isso significa que, se:

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` estiverem corretos, e
- As funções `send-whatsapp`, `send-webhook` e `reset-daily` existirem no seu projeto

então o front automaticamente falará com o seu backend.

---

## 7. Checklist de debug

Se algo não funcionar, siga esta lista:

1. **Erro de tabela/coluna não encontrada**  
   → Confira se você rodou **ambos** arquivos: `00_schema_estrutura.sql` e `01_policies_rls.sql`.

2. **Erro de permissão / RLS**  
   → Veja se as policies foram criadas (aba **RLS** da tabela).  
   → Como as policies atuais são "Anyone ...", dificilmente o erro será RLS, mas é bom checar.

3. **Edge Function não encontrada (404)**  
   → Confira se o nome da função no Supabase é exatamente igual ao usado no código.

4. **Erro interno na função (500)**  
   → Abra a função no painel → veja os **logs** para entender o erro.

5. **Nada responde / URL errada**  
   → Verifique se `VITE_SUPABASE_URL` está apontando para o SEU projeto.

Se tiver qualquer erro específico, copie a mensagem de erro e me mande que eu te ajudo a ajustar o SQL ou as configurações.
