## O que será feito

Duas melhorias de segurança na autenticação:

1. **Recuperação de senha** no fluxo de login
2. **Autenticação de 2 fatores (2FA)** opcional via app autenticador (Google Authenticator, Authy, 1Password etc.) no perfil do usuário

---

### 1. Esqueci minha senha (em `/auth`)

- Adicionar link **"Esqueci minha senha"** abaixo do campo de senha na aba "Entrar" de `src/pages/Auth.tsx`.
- Abrir um diálogo simples (Dialog do shadcn) pedindo o e-mail e disparar:
  ```ts
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  ```
- Toast de confirmação ("Enviamos um link para seu e-mail").
- Criar nova página pública **`/reset-password`** (`src/pages/ResetPassword.tsx`) que:
  - Detecta o token de recuperação na URL (Supabase já cria sessão tipo `recovery`).
  - Mostra formulário de "Nova senha" + "Confirmar senha".
  - Chama `supabase.auth.updateUser({ password })` e redireciona para `/painel`.
- Registrar a rota em `src/App.tsx` como rota pública (fora do AppShell).

### 2. Autenticação de 2 fatores (TOTP)

- Habilitar TOTP MFA no projeto (já vem ativo por padrão no Supabase Auth — não precisa migration).
- Criar componente **`TwoFactorSection`** dentro de `src/pages/MyProfile.tsx` (nova seção "Segurança"):
  - **Estado desativado**: botão "Ativar autenticação em 2 fatores" → chama `supabase.auth.mfa.enroll({ factorType: 'totp' })`, mostra QR code (`data.totp.qr_code`) + chave manual, pede código de 6 dígitos, finaliza com `supabase.auth.mfa.challenge` + `verify`. Toast de sucesso.
  - **Estado ativado**: mostra "2FA ativo" com badge verde + botão "Desativar" (chama `supabase.auth.mfa.unenroll`).
  - Listagem dos fatores via `supabase.auth.mfa.listFactors()`.
- Atualizar **fluxo de login** em `Auth.tsx`:
  - Após `signIn` bem-sucedido, chamar `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`.
  - Se `currentLevel === 'aal1'` e `nextLevel === 'aal2'`, exibir tela de "Digite o código do seu app autenticador" (modal/step) em vez de redirecionar.
  - Validar com `supabase.auth.mfa.challengeAndVerify({ factorId, code })`.
  - Só após sucesso → redirect normal (`/painel`).
- Logout/sessão: nada a mudar — Supabase persiste o AAL2.

### 3. Memória

Atualizar `mem://index.md` com referência:
- `[Auth Security: Reset & 2FA](mem://features/auth-security)` — Reset password via `/reset-password` + TOTP MFA opcional gerenciado em `MyProfile`, com gate de AAL2 no login.

---

## Arquivos afetados

**Criados:**
- `src/pages/ResetPassword.tsx`
- `src/components/auth/ForgotPasswordDialog.tsx`
- `src/components/auth/MfaChallengeDialog.tsx`
- `src/components/profile/TwoFactorSection.tsx`
- `mem://features/auth-security`

**Editados:**
- `src/pages/Auth.tsx` — link "Esqueci senha" + gate MFA pós-login
- `src/App.tsx` — rota pública `/reset-password`
- `src/pages/MyProfile.tsx` — adicionar `<TwoFactorSection />`
- `mem://index.md`

## Notas técnicas

- TOTP MFA já vem habilitado por padrão no Supabase Auth — não requer migration nem mudança em `config.toml`.
- Não usaremos SMS MFA (custo + setup adicional).
- O reset de senha usa o template padrão de e-mail do Lovable Cloud (já funciona out-of-the-box).
