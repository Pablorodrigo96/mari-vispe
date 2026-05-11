# Desbloquear o reset padrão pro Sérgio

As correções de código já estão no ar (ResetPassword.tsx defensivo + canonical redirect + botão "Pedir novo link"). O que falta é validar a config externa e dar visibilidade do erro real caso falhe de novo.

## 1. Validar allowlist de Redirect URLs (você faz no painel)

Em **Cloud → Users → URL Configuration**, confirmar que estão na lista:
- `https://mari.vispe.com.br/reset-password`
- `https://mari.vispe.com.br/**` (wildcard, recomendado)
- `https://mari-vispe.lovable.app/reset-password` (fallback)

Sem isso, todo link de recovery chega "expirado" mesmo com código correto.

## 2. Roteiro pro Sérgio (copy/cola pra ele)

> 1. Abrir `https://mari.vispe.com.br/auth` **no Chrome do desktop** (não pelo Outlook embutido)
> 2. Clicar em "Esqueci a senha", colocar `sergio.william@vispe.com.br`
> 3. Abrir o email **direto no navegador** (Gmail web / Outlook web) — não no app desktop, e **não passar o mouse no link** antes de clicar
> 4. Clicar UMA vez no botão "Redefinir senha"
> 5. Definir senha nova (mínimo 8 caracteres) e confirmar

## 3. Instrumentação leve no ResetPassword.tsx

Para debugar se ele falhar de novo, adicionar:
- `console.log` do `error.code` e `error.message` retornado pelo `updateUser`
- Exibir o `error.message` exato na tela (hoje mostra mensagem genérica "pode ter expirado")
- Logar `event` recebido no `onAuthStateChange` (`PASSWORD_RECOVERY` vs `SIGNED_IN` vs nada)

Assim, se travar, ele manda print e a gente sabe se é token consumido, AAL2 pendente, política HIBP rejeitando senha fraca, etc.

## 4. Fallback admin (já pronto, não precisa fazer nada)

Se mesmo assim falhar, `/admin/usuarios` → 3 pontinhos no Sérgio → **Resetar senha** continua disponível como rede de segurança.

## Fora de escopo
- Não vou mexer em AuthContext, MFA, signup ou no `auth-email-hook` agora.
- Branded email via auth-email-hook fica pra fase seguinte (só faz sentido depois de confirmar que o fluxo padrão funciona).

## Detalhes técnicos
- Arquivo afetado: `src/pages/ResetPassword.tsx` (apenas adicionar logs + exibir `error.message`)
- Nenhuma migração SQL
- Nenhuma edge function nova
