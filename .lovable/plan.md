## Diagnóstico

O usuário **sergio.william@vispe.com.br** descreve: o email de redefinição chega, abre a página, mas ao confirmar a nova senha aparece **"Não foi possível redefinir a senha. O link pode ter expirado."**

Esse toast vem de `supabase.auth.updateUser({ password })` retornando erro. Investigando o código atual, três causas se sobrepõem:

1. **Pré-fetch de antivírus em servidores corporativos (Outlook/Microsoft Defender, Gmail)** consome o token de recovery antes do clique humano. Quando o Sérgio clica de verdade, o token já foi usado → "expirado".
2. **`redirectTo` usa `window.location.origin`** em `ForgotPasswordDialog.tsx`. Se ele pediu reset em um domínio (ex.: preview Lovable) e clica no link em outro device cuja URL canônica é `mari.vispe.com.br`, a sessão recovery pode não ser criada corretamente.
3. **`ResetPassword.tsx` verifica `getSession()` no `useEffect` inicial**, antes do `onAuthStateChange` processar o hash de recovery → falsos negativos. E não há listener para o evento `PASSWORD_RECOVERY`.

Não há nenhuma edge function de admin para resetar senha (só `admin-delete-user`). Sem isso, hoje a única forma de destravar o Sérgio é eu (admin) ir ao painel Lovable Cloud manualmente.

## Plano

### 1. Destravar o Sérgio imediatamente (operacional, sem código)

Como admin, vou abrir **Cloud → Users**, localizar `sergio.william@vispe.com.br` e usar **"Send password recovery"** ou **"Set password"** diretamente. Como esse caminho não passa por email com prefetch, ele resolve no ato.

```text
<lov-open-backend>Abrir Lovable Cloud Users</lov-open-backend>
```

Vou deixar a ação pronta na resposta final pra você clicar e executar.

### 2. Endurecer o fluxo de reset (código)

**A) `src/components/auth/ForgotPasswordDialog.tsx`**
- Trocar `redirectTo: ${origin}/reset-password` por um helper `getResetRedirectUrl()` que prioriza, nesta ordem:
  1. Custom domain canônico (`https://mari.vispe.com.br/reset-password`) quando rodando em produção
  2. `window.location.origin` em dev/preview
- Mostrar mensagem reforçando *"Abra o link no mesmo dispositivo onde solicitou e clique apenas uma vez. Se demorar mais de 1h, peça um novo."*

**B) `src/pages/ResetPassword.tsx`** — reescrita defensiva
- Trocar a checagem inicial por um `onAuthStateChange` que escuta `PASSWORD_RECOVERY` e seta `hasRecoverySession=true` quando o evento dispara
- Manter `getSession()` apenas como fallback após 600ms (para casos onde o hash já foi processado antes do mount)
- Logar no console o `error.message` completo quando `updateUser` falhar (hoje engole o motivo) e exibir ao usuário a mensagem real da Supabase em vez de "pode ter expirado"
- Adicionar botão **"Pedir um novo link"** que reabre o dialog de forgot-password sem precisar voltar pra `/auth`

**C) Configuração Supabase Auth — Site URL & Redirect URLs**
- Verificar/garantir que estão na allowlist:
  - `https://mari.vispe.com.br`
  - `https://mari.vispe.com.br/reset-password`
  - `https://mari-vispe.lovable.app`
  - `https://mari-vispe.lovable.app/reset-password`
  - `https://id-preview--3527d651-37d5-470b-a926-60f25d8e322b.lovable.app`
- Site URL canônico = `https://mari.vispe.com.br`
- Isso é configurado em **Cloud → Users → Auth Settings (URL Configuration)**, não via código

### 3. Edge function `admin-set-password` (opcional, mas recomendado)

Cria função admin-only (gate via `has_role(auth.uid(),'admin')`) que recebe `{ user_id, new_password }` e chama `supabase.auth.admin.updateUserById`. Isso permite destravar usuários futuros direto pelo painel admin sem entrar no Lovable Cloud.

- Local: `supabase/functions/admin-set-password/index.ts`
- Botão **"Resetar senha"** no `/admin/usuarios` (`AdminUsers.tsx`) ao lado do delete.

### 4. (Opcional — fase 2) Auth-email-hook

Hoje os emails de reset saem com o template padrão Lovable (sem branding mari). Não é a causa do bug, mas se quiser, em outro passo podemos scaffold `auth-email-hook` para mandar pelo `notify.vispe.com.br` com layout mari + link único + texto mais claro instruindo *"clique apenas uma vez, expira em 1h"*.

## Fora de escopo

- Não alterar `AuthContext.tsx` nem RLS
- Não mexer em login normal, MFA ou signup
- Não scaffold auth-email-hook nesta rodada (separamos em fase 2)

## Critério de aceite

- Sérgio consegue entrar hoje
- Próximo usuário que pedir reset: ao clicar no email → vê a página → digita senha → loga normalmente, mesmo se for em outro device
- Se o token tiver sido prefetched ou expirado, a tela mostra **a mensagem real** + botão "Pedir um novo link" sem precisar navegar
- Admin tem botão "Resetar senha" em `/admin/usuarios`