

## Plano: Corrigir acesso ao Blind Teaser e substituir formulario de contato por fluxo de "Registrar Interesse"

### Problemas identificados

1. **Blind Teaser inacessivel apos criacao**: A `public_listings` view filtra por `status = 'active'`, mas o listing e criado com `status = 'active'` para plano basico. O acesso direto via URL funciona (confirmei que os dados estao la). O problema pode estar no fato de o usuario nao estar testando a URL correta, ou pode haver um bug de navegacao. Preciso investigar se ha algo bloqueando (ex: o usuario esta logado e o RLS nao permite acesso pela view). **A view `public_listings` nao tem RLS (e uma view, nao tabela)**, entao o acesso deveria funcionar. Vou garantir que funcione adicionando um fallback de busca direto na tabela `listings` com filtro publico.

2. **Secao de contato deve virar "Registrar Interesse"**: Remover o formulario de contato e substituir por um botao "Registrar Interesse" que redireciona para `/auth?redirect=/teaser/:ticker&tab=signup&role=buyer`. Ao se cadastrar, o interesse e registrado automaticamente.

3. **Log de interesse para o administrador**: Criar uma tabela `interest_logs` para registrar quando alguem demonstra interesse em um listing.

---

### Mudancas

#### 1. Migracao: Criar tabela `interest_logs`

```sql
CREATE TABLE public.interest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ticker TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interest_logs ENABLE ROW LEVEL SECURITY;

-- Usuarios logados podem registrar interesse
CREATE POLICY "Users can insert own interest" ON public.interest_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuarios podem ver seus proprios interesses
CREATE POLICY "Users can view own interests" ON public.interest_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Admins podem ver todos
CREATE POLICY "Admins can view all interests" ON public.interest_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
```

#### 2. Modificar `src/components/teaser/TeaserContact.tsx`

Substituir o formulario completo por:
- Um botao grande "Registrar Interesse" com estilo dourado
- Ao clicar, se o usuario esta logado: registra o interesse na tabela `interest_logs` e mostra confirmacao
- Se nao esta logado: redireciona para `/auth?redirect=/teaser/:ticker&tab=signup&interest=true`
- Manter o botao WhatsApp
- Manter o disclaimer de confidencialidade

#### 3. Modificar `src/pages/BlindTeaser.tsx`

- Apos o usuario voltar da autenticacao (redirect), verificar se deve registrar interesse automaticamente
- Adicionar logica para inserir na tabela `interest_logs` ao carregar a pagina se o parametro `interest=true` estiver presente e o usuario estiver logado

#### 4. Modificar `src/pages/Auth.tsx`

- Aceitar parametro `tab=signup` na URL para abrir diretamente na aba de cadastro
- Aceitar parametro `role=buyer` para pre-selecionar o perfil de comprador

#### 5. Painel Admin: Exibir interesses

- Adicionar uma secao no `AdminDashboard` ou criar uma nova pagina para listar os `interest_logs` com ticker, data e dados do usuario

---

### Secao Tecnica

**Fluxo do "Registrar Interesse":**

```text
Usuario no Blind Teaser (/teaser/TECH01)
  |
  +--> Clica "Registrar Interesse"
  |
  +--> Logado? 
  |     SIM -> Insere em interest_logs -> Mostra sucesso
  |     NAO -> Redireciona para /auth?redirect=/teaser/TECH01&tab=signup&interest=true
  |              |
  |              +--> Cria conta (role buyer pre-selecionado)
  |              +--> Redirect de volta para /teaser/TECH01?interest=true
  |              +--> BlindTeaser detecta parametro, insere em interest_logs
```

**Tabela `interest_logs`:**

| Campo | Tipo | Descricao |
|---|---|---|
| id | UUID | PK |
| listing_id | UUID | Referencia ao listing |
| user_id | UUID | Usuario que registrou interesse |
| ticker | TEXT | Ticker para facilitar consulta |
| created_at | TIMESTAMPTZ | Data/hora do registro |

**Arquivos modificados:**

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar tabela `interest_logs` |
| `src/components/teaser/TeaserContact.tsx` | Substituir formulario por botao "Registrar Interesse" |
| `src/pages/BlindTeaser.tsx` | Adicionar logica de registro automatico pos-login |
| `src/pages/Auth.tsx` | Aceitar `tab` e `role` como parametros da URL |
| `src/pages/admin/AdminDashboard.tsx` | Adicionar secao de interesses registrados |

