# Integração Kiwify → liberação automática de acesso

## 1. Variáveis de ambiente (adicionar no Vercel → Settings → Environment Variables)

| Variável | Onde conseguir |
|---|---|
| `KIWIFY_WEBHOOK_TOKEN` | Você define esse valor na hora de criar o webhook no painel da Kiwify (campo "Token"). Use o mesmo valor nos dois lugares. |
| `RESEND_API_KEY` | Criar conta grátis em resend.com → API Keys. |
| `RESEND_FROM_EMAIL` | Um remetente verificado no Resend, ex.: `Ascen <acesso@seudominio.com>`. Precisa verificar o domínio no Resend antes (registro DNS). |
| `NEXT_PUBLIC_APP_URL` | URL do app em produção, ex.: `https://seuapp.vercel.app` (usado só pro link no e-mail). |

`SUPABASE_SERVICE_ROLE_KEY` e `NEXT_PUBLIC_SUPABASE_URL` já devem existir (são usadas pelas notificações push).

## 2. Configurar o webhook na Kiwify

1. No painel Kiwify → **Apps → Webhooks → Criar Webhook**.
2. URL do webhook: `https://SEU-APP.vercel.app/api/webhooks/kiwify?signature=SEU_TOKEN`
   (troque `SEU_TOKEN` pelo mesmo valor de `KIWIFY_WEBHOOK_TOKEN`).
3. Produto: selecione o produto correspondente ao app (ou "todos").
4. Eventos: marque pelo menos `compra_aprovada`, `compra_reembolsada` e `chargeback`. Se o produto for assinatura recorrente, marque também `subscription_renewed` e `subscription_canceled`.
5. Salve.

## 3. Testar antes de confiar 100%

⚠️ **Importante**: eu montei o parser do payload com o formato mais comumente documentado pela comunidade Kiwify, mas não tenho uma fonte 100% oficial confirmando os nomes exatos dos campos pra esse webhook específico (o "clássico", de vendas — diferente da API bancária deles, essa sim bem documentada). Antes de divulgar o link de venda:

1. Clique em **"Testar Webhook"** no painel da Kiwify (dispara um evento de teste).
2. Vá em Vercel → seu projeto → aba **Logs** → procure a linha `[kiwify webhook] payload recebido:`.
3. Copie esse JSON e me manda aqui — eu ajusto o parser (`evento`, `email`, `nome`, `orderId`) pros nomes reais dos campos, se forem diferentes do que assumi.
4. Faça uma compra de teste de verdade (a Kiwify tem modo sandbox/teste) e confirme que o e-mail com o código chega.

## 4. O que ainda falta (Parte 2)

Se a compra for reembolsada ou sofrer chargeback **depois** que a pessoa já usou o código pra criar a conta, hoje o webhook só desativa o código (se ainda não usado) — ele **não** revoga o acesso de quem já entrou. Pra automatizar isso também, preciso ver a definição SQL da função `resgatar_acesso()` (ela não está versionada neste repositório — parece ter sido criada direto no SQL Editor do Supabase). Se você exportar essa função (Supabase → Database → Functions → `resgatar_acesso` → copiar definição) e me mandar, eu completo essa parte.
