# Configuração de pagamento com gateways (Asaas e Seabra)

Este documento explica, de forma prática, como configurar o **pagamento de franquias** usando
os gateways **Asaas** e **Seabra** dentro do sistema.

A configuração é feita pelo **Super Admin**, na tela **Franquias → sessão Pagamento**.

---

## 1. Visão geral: gateway, API Key e webhook de cobrança

Antes de configurar, é importante entender alguns conceitos:

### 1.1. Gateway de pagamento

- É o serviço responsável por **criar e gerenciar cobranças** (boletos, PIX, cartão etc.).
- Exemplos: **Asaas**, **Seabra**.
- Nosso sistema envia requisições para o gateway usando a **API Key** que você informar.

### 1.2. API Key

- É um **token secreto** gerado no painel do gateway.
- Funciona como uma senha para que o sistema possa criar cobranças em nome da sua conta.
- Nunca compartilhe sua API Key em prints, mensagens ou e-mails.

### 1.3. Webhook de cobrança (URL)

- É a **URL do seu backend** que o gateway chama quando algo acontece em uma cobrança,
  por exemplo:
  - Pagamento confirmado.
  - Boleto vencido.
  - Cobrança cancelada.
- Ela **não substitui** o gateway – apenas permite **automatizar** o retorno das informações
  de pagamento para o sistema.

> **Importante:** neste momento, o campo de webhook no sistema é **opcional**.
> Você pode configurar o gateway e a API Key normalmente, mesmo sem ter a URL de webhook pronta.

---

## 2. Campos da sessão "Pagamento" na tela de Franquias

Na tela do **Super Admin**, aba **Franquias**, ao editar uma franquia, existe uma
sessão chamada **Pagamento** (config_pagamento). Os principais campos são:

### 2.1. Gateway de pagamento

- Campo: `Gateway de pagamento` (provider)
- O que é: seleção do serviço que será usado para gerar as cobranças da franquia.
- Exemplos de valores:
  - `asas` – para Asaas.
  - `seabra` – para Seabra.

### 2.2. API Key

- Campo: `API Key (não publique)`
- O que é: token secreto copiado do painel do gateway.
- Para que serve: o sistema usa essa chave para autenticar chamadas de API e criar cobranças.
- Boas práticas:
  - Tratar como senha.
  - Se suspeitar de vazamento, revogar no painel do gateway e gerar uma nova.

### 2.3. Webhook de cobrança (URL)

- Campo: `Webhook de cobrança (URL do seu backend)`
- O que é: URL do SEU backend para receber notificações automáticas do gateway
  (confirmação de PIX, boletos pagos, vencidos etc.).
- Situação atual:
  - **Opcional** – pode ser deixado em branco.
  - No futuro, quando o backend de webhook estiver implementado, você receberá
    a URL correta para preencher aqui e também no painel do gateway.

> Enquanto você não tiver essa URL, **não há problema** em deixar o campo vazio.
> O sistema continuará funcionando para **criar cobranças** manualmente.

---

## 3. Como configurar o Asaas

### 3.1. Criar/entrar na conta Asaas

1. Acesse o painel do Asaas (ambiente de produção ou sandbox, conforme necessidade).
2. Crie ou use uma conta já existente.
3. Certifique-se de que sua conta está habilitada para uso de API.

### 3.2. Gerar a API Key no Asaas

1. No painel do Asaas, acesse a área de **Configurações → API / Integrações** (o nome pode variar).
2. Localize a opção para **criar um token de API** ou **gerar chave de acesso**.
3. Gere uma **API Key** para uso no sistema.
4. Copie a chave gerada.

> Dica: use uma chave diferente para ambiente de testes e de produção.

### 3.3. Preencher os dados do Asaas no sistema

1. Acesse o sistema como **Super Admin**.
2. Vá para a aba **Franquias**.
3. Clique em **Editar** na franquia desejada.
4. Na sessão **Pagamento**:
   - Campo **Gateway de pagamento**: selecione **Asaas** (ou `asas`).
   - Campo **API Key**: cole a chave gerada no painel do Asaas.
   - Campo **Webhook de cobrança (URL do seu backend)**:
     - Se você **ainda não tem** uma URL de webhook:
       - **Deixe em branco.**
     - Se nossa equipe já forneceu uma URL de webhook específica:
       - Cole essa URL aqui (e siga também o passo 3.4 abaixo no painel Asaas).
5. Salve a franquia.

A partir desse momento, o sistema consegue usar o Asaas como gateway para criar cobranças.

### 3.4. (Opcional) Configurar o webhook no painel Asaas

> Esta etapa depende de você já ter recebido uma **URL de webhook** do seu backend.

1. No painel Asaas, vá até a seção de **Webhooks / Notificações de eventos**.
2. Crie um novo webhook apontando para a URL fornecida
   (ex.: `https://seudominio.com/webhook-cobranca-asaas`).
3. Selecione os eventos que você deseja receber, por exemplo:
   - Pagamento confirmado.
   - Pagamento vencido.
   - Pagamento cancelado.
4. Salve a configuração.

Quando o backend de webhook estiver implementado, o fluxo será:

- O sistema cria uma cobrança no Asaas usando a **API Key**.
- Quando o pagamento for confirmado, o Asaas chama a **URL de webhook**.
- O backend interpreta o evento e atualiza automaticamente:
  - `status_pagamento` da franquia.
  - `data_vencimento` da franquia.

---

## 4. Como configurar a Seabra

> A nomenclatura exata dos menus pode variar conforme a versão do painel da Seabra,
> mas o conceito é o mesmo do Asaas.

### 4.1. Criar/entrar na conta Seabra

1. Acesse o painel do gateway Seabra.
2. Crie ou acesse sua conta.
3. Verifique se a conta está habilitada para uso via API.

### 4.2. Gerar a API Key / token de acesso na Seabra

1. No painel, procure por **API**, **Integrações** ou similar.
2. Localize a seção de **tokens de acesso** ou **API Key**.
3. Gere uma nova chave de acesso para uso no sistema.
4. Copie a chave gerada.

### 4.3. Preencher os dados da Seabra no sistema

1. Acesse o sistema como **Super Admin**.
2. Vá até a aba **Franquias** e edite a franquia desejada.
3. Na sessão **Pagamento**:
   - Campo **Gateway de pagamento**: selecione **Seabra** (`seabra`).
   - Campo **API Key**: cole a chave gerada no painel da Seabra.
   - Campo **Webhook de cobrança (URL do seu backend)**:
     - Se você ainda não tiver a URL: **deixe em branco**.
     - Se já tiver uma URL de webhook definida pelo backend, cole aqui.
4. Salve a franquia.

### 4.4. (Opcional) Configurar o webhook no painel Seabra

1. No painel da Seabra, vá até a área de **Webhooks / Notificações / Callbacks**.
2. Cadastre a URL de webhook fornecida pelo backend
   (ex.: `https://seudominio.com/webhook-cobranca-seabra`).
3. Selecione os eventos relevantes (pagamento aprovado, vencido, cancelado etc.).
4. Salve.

Assim como no Asaas, o fluxo ideal será:

- O sistema cria a cobrança via API usando a API Key da Seabra.
- A Seabra envia uma notificação HTTP (webhook) para a URL configurada.
- O backend processa a notificação e atualiza automaticamente os dados da franquia.

---

## 5. Boas práticas de segurança

- **Nunca** compartilhe suas API Keys em conversas, prints ou tickets públicos.
- Use sempre **HTTPS** nas URLs de webhook.
- Planeje chaves diferentes para **testes** e **produção**.
- Se desconfiar de vazamento:
  - Revogue a chave no painel do gateway.
  - Gere uma nova.
  - Atualize a configuração no sistema.

---

## 6. Próximos passos (quando o webhook estiver disponível)

Em uma próxima etapa, o backend poderá expor uma URL de webhook única para cobranças, por exemplo:

- `https://seudominio.com/webhook-cobranca`

Quando isso acontecer, o passo a passo será:

1. Preencher essa URL no campo **Webhook de cobrança (URL do seu backend)** na tela de Franquias.
2. Configurar a mesma URL nos painéis do Asaas e da Seabra, na área de Webhooks.
3. Confirmar, em testes, que os pagamentos aprovados estão atualizando automaticamente
   o **status de pagamento** e a **data de vencimento** das franquias.

Enquanto essa automação completa não estiver ativa, você já pode usar **gateway + API Key**
para controlar manualmente a cobrança das franquias pelo sistema.