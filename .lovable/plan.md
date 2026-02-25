

## Plano: Fluxo Completo de Registro de Interesse

### Problema Atual
1. O registro de interesse salva apenas `user_id`, `listing_id` e `ticker` -- sem capturar dados de contato do investidor
2. Nenhuma notificação é enviada ao dono do anúncio nem ao admin
3. O painel "Meus Anúncios" não exibe os interesses recebidos
4. A tela de sucesso não oferece CTA para acelerar o contato
5. O dono do listing não tem RLS para ver interesses nos seus anúncios

---

### 1. Migração: Expandir `interest_logs` + RLS

Adicionar colunas para capturar dados do investidor e permitir que donos dos listings vejam os interesses recebidos.

```sql
ALTER TABLE public.interest_logs
  ADD COLUMN investor_name text,
  ADD COLUMN investor_company text,
  ADD COLUMN investor_email text,
  ADD COLUMN investor_whatsapp text;

-- Donos dos listings podem ver interesses nos seus anúncios
CREATE POLICY "Listing owners can view interests"
  ON public.interest_logs FOR SELECT
  USING (listing_id IN (
    SELECT id FROM public.listings WHERE user_id = auth.uid()
  ));
```

---

### 2. Formulário de Interesse (`TeaserContact.tsx`)

Substituir o botão direto por um formulário que coleta:
- **Nome completo** (pré-preenchido do perfil se logado)
- **Nome da empresa** (pré-preenchido do perfil)
- **E-mail** (pré-preenchido do auth)
- **WhatsApp** (pré-preenchido do perfil)

Fluxo:
1. Se não logado: redireciona para cadastro (como já faz)
2. Se logado: exibe formulário com campos pré-preenchidos
3. Ao submeter: salva no `interest_logs` com os dados de contato

Tela de sucesso após registro:
- Selo "Interesse Registrado!"
- Mensagem: "Se quiser acelerar, entre em contato com nosso time"
- Botão WhatsApp do time PME.B3

| Arquivo | Acao |
|---|---|
| `TeaserContact.tsx` | Substituir botão por formulário com 4 campos + tela de sucesso com CTA |

---

### 3. Notificações Automáticas

Após inserir o interesse, criar notificações via insert direto no client:

**Para o dono do listing:**
```
Título: "Novo interesse registrado!"
Conteúdo: "[Nome do investidor] demonstrou interesse no seu ativo [TICKER]"
```

**Para admins:**
```
Título: "Novo interesse registrado!"
Conteúdo: "[Nome] - [Email] interessado em [TICKER]"
```

Para encontrar o dono do listing, buscar `listings.user_id` pelo `listing_id`. Para admins, buscar da `user_roles`.

| Arquivo | Acao |
|---|---|
| `TeaserContact.tsx` | Após insert do interesse, inserir notificações para owner e admins |

---

### 4. Seção de Interesses em "Meus Anúncios" (`MyListings.tsx`)

Para cada listing, buscar interesses da tabela `interest_logs` e exibir:
- Badge com contagem de interesses (ex: "3 interessados")
- Ao expandir/clicar: lista com nome, empresa, email, whatsapp de cada investidor
- Apenas para plano Master (básico vê contagem + CTA upgrade)

| Arquivo | Acao |
|---|---|
| `MyListings.tsx` | Buscar `interest_logs` por listing, exibir contagem + lista de investidores interessados |

---

### 5. Auto-registro após redirect (`BlindTeaser.tsx`)

Atualizar o auto-registro para também salvar os dados do perfil do investidor (buscando da tabela `profiles`).

| Arquivo | Acao |
|---|---|
| `BlindTeaser.tsx` | No auto-registro, buscar perfil do user e incluir dados de contato no insert |

---

### Seção Tecnica

**Migração SQL:**
- 4 novas colunas em `interest_logs`: `investor_name`, `investor_company`, `investor_email`, `investor_whatsapp`
- 1 nova RLS policy para listing owners

**Formulario em TeaserContact.tsx:**
- 4 inputs: nome, empresa, email, whatsapp
- `useEffect` para buscar perfil e pre-preencher
- Insert inclui os 4 campos + gera notificações
- Tela de sucesso com CTA WhatsApp

**Notificações:**
- Buscar `user_id` do listing para notificar owner
- Buscar admins via `user_roles` para notificar admins
- Insert na tabela `notifications` com type `'system'`

**MyListings.tsx:**
- Fetch `interest_logs` com `listing_id IN (ids dos listings do user)`
- Estado `interests: Record<string, InterestLog[]>`
- Exibir badge de contagem + accordion/dialog com detalhes dos investidores
- Stats card "Interessados" no topo

**Arquivos modificados:** 3 arquivos + 1 migração SQL

| Arquivo | Acao |
|---|---|
| Migração SQL | Expandir `interest_logs` + RLS para owners |
| `TeaserContact.tsx` | Formulário com dados do investidor + notificações + CTA sucesso |
| `BlindTeaser.tsx` | Auto-registro com dados do perfil |
| `MyListings.tsx` | Seção de interesses recebidos por listing |

