## Diagnóstico

**1. Piscar/reload em `/valuation/plano-perfeito`**
Olhando o network: a página dispara 4 `page_view` em ~9s, alternando entre `?__lovable_sha=...` (sem user) e URL limpa (com user). Isso é o `main.tsx` reagindo a `Failed to fetch dynamically imported module` (chunk antigo após deploy) e chamando `window.location.reload()`. Como o `RELOAD_FLAG` é limpo após 2s no `window.load`, se o erro voltar a ocorrer (importação preguiçosa de algum componente do wizard), entra em loop.

**2. Após signup, não entra no resultado**
O `handleSubmit` já tenta `signInWithPassword` e segue para `setResult(calc)`. Mas se `supabase.auth.getUser()` ainda não propagou, cai no fallback `navigate('/auth?redirect=…')` — o usuário perde o cálculo. Além disso, o resultado vive apenas em state local; sair da página e voltar pelo menu reabre o wizard zerado.

**3. Menu "O Plano Perfeito" sempre abre o formulário**
`PlanoPerfeitoWizard` começa em `step=0` sem checar se o usuário já tem um plano salvo em `planos_perfeitos`.

---

## Plano

### A. Estancar o loop de reload (`src/main.tsx`)
- Tornar o auto-reload **idempotente por sessão**: remover o `setTimeout(clear, 2000)` no `window.load`. O flag só é limpo se o usuário trocar de rota com sucesso (navegação manual). Assim, no máximo 1 reload por sessão de aba.
- Trocar `sessionStorage` por marca em `window.name` opcionalmente — mantém entre reloads mas zera ao fechar aba.

### B. Auto-login e ir direto pro resultado (`PlanoPerfeitoWizard.tsx`)
- Após `signInWithPassword`, esperar a sessão com **polling curto** (até 8× 250ms em `supabase.auth.getSession()`) em vez de uma única chamada a `getUser()`.
- Se mesmo assim falhar, em vez de mandar pra `/auth`, **renderizar o resultado calculado direto** (já temos `calc` na memória) e mostrar um toast pedindo confirmação por e-mail — o cálculo nunca é perdido.
- Persistir `calc` antes do auto-login também (já está). Garantir que `setResult(calc)` acontece sempre que o cálculo deu certo, independente do estado da sessão.

### C. Reabrir último plano ao entrar pelo menu (`PlanoPerfeitoWizard.tsx`)
- No mount, se `user` existir, buscar via `usePlanosPerfeitos` o último plano.
- Se houver: hidratar `setResult(ultimoPlano.result)` automaticamente e mostrar tela de resultado com:
  - Botão **"Criar novo Plano Perfeito"** (zera state e volta para step 0).
  - Botão **"Ver histórico"** → `/meus-planos-perfeitos`.
- Se não houver plano: comportamento atual (wizard step 0).
- Suportar `?novo=1` na URL para forçar wizard mesmo com plano salvo (para o caso do usuário clicar em "Novo Plano" em `MeusPlanosPerfeitos`).

### D. Ajustes pequenos
- Em `MeusPlanosPerfeitos`, fazer `Novo Plano` navegar com `?novo=1`.
- Em `PlanoPerfeitoResultView` (quando carregado de histórico), garantir que `onRestart` navega com `?novo=1` em vez de só zerar o state.

---

## Arquivos tocados
- `src/main.tsx` — remover limpeza automática do flag de reload.
- `src/components/valuation/plano-perfeito/PlanoPerfeitoWizard.tsx` — polling de sessão, fallback robusto, hidratação do último plano via `usePlanosPerfeitos`, leitura de `?novo=1`.
- `src/pages/MeusPlanosPerfeitos.tsx` — `Novo Plano` com `?novo=1`.

Sem mudanças de schema, sem novas rotas, sem mexer no Hero (que já foi ajustado nas iterações anteriores).
