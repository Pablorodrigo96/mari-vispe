

## Plano: Cadastro de Compradores no Mapa

### Objetivo
Permitir cadastrar "compradores" (investidores/buyers) com dados como setor de interesse, tamanho de cheque, região desejada, e exibi-los no mapa com marcadores azuis, ao lado dos vendedores (dourados).

---

### 1. Nova Tabela: `buyer_profiles`

Armazena perfis de compradores cadastrados por consultores/admins/franqueados.

```text
buyer_profiles
├── id (uuid, PK)
├── user_id (uuid, NOT NULL) -- quem cadastrou
├── buyer_name (text, NOT NULL)
├── company_name (text)
├── email (text)
├── whatsapp (text)
├── categories (text[], NOT NULL) -- setores de interesse
├── min_budget (numeric) -- cheque mínimo
├── max_budget (numeric) -- cheque máximo
├── city (text)
├── state (text)
├── description (text) -- breve descrição do que busca
├── status (text, default 'active') -- active, inactive
├── created_at (timestamptz, default now())
```

**RLS:**
- INSERT: authenticated users (sellers, advisors, franchisees, admins)
- SELECT: authenticated users can view active buyers; owners can view own
- UPDATE/DELETE: owner or admin

---

### 2. Página de Cadastro de Comprador

Nova página `/cadastrar-comprador` com formulário:
- Nome do comprador, empresa, email, WhatsApp
- Setores de interesse (multi-select usando as mesmas categorias do marketplace)
- Faixa de investimento (min/max com inputs de moeda)
- Localização (CEP com auto-fill de cidade/estado)
- Descrição do que busca

Acessível via Header (novo item no menu) e via botão no mapa.

---

### 3. Mapa: Exibir Compradores com Marcadores Azuis

**`BusinessMap.tsx`:**
- Receber nova prop `buyers: BuyerProfile[]`
- Criar `buyerIcon` azul (mesmo formato do dourado, mas `hsl(210, 80%, 50%)`)
- Resolver coordenadas dos compradores da mesma forma que listings
- Popup do comprador mostra: nome, setores de interesse, faixa de cheque, botão "Entrar em Contato"
- Clusters separados ou mistos (mistos faz mais sentido geograficamente)

**`MapView.tsx`:**
- Buscar `buyer_profiles` com `status = 'active'` junto com listings
- Passar ambos para `BusinessMap`

**`MapFilterSidebar.tsx`:**
- Novo filtro "Tipo" com checkboxes: Vendedores / Compradores (ambos ativos por padrão)

**Stats bar:**
- Adicionar contador de compradores (ícone azul) ao lado dos vendedores

---

### 4. Legenda Visual no Mapa

Pequena legenda no canto do mapa:
- Marcador dourado = Empresa à venda
- Marcador azul = Comprador ativo

---

### Seção Tecnica

**Migração SQL:**
```sql
CREATE TABLE public.buyer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  buyer_name text NOT NULL,
  company_name text,
  email text,
  whatsapp text,
  categories text[] NOT NULL DEFAULT '{}',
  min_budget numeric,
  max_budget numeric,
  city text,
  state text,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active buyers"
  ON public.buyer_profiles FOR SELECT TO authenticated
  USING (status = 'active' OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert buyers"
  ON public.buyer_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and admins can update buyers"
  ON public.buyer_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can delete buyers"
  ON public.buyer_profiles FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_buyer_profiles_status ON public.buyer_profiles(status);
CREATE INDEX idx_buyer_profiles_state ON public.buyer_profiles(state);
```

**Marcador azul:**
```text
Mesmo shape do dourado mas com hsl(210, 80%, 50%) / hsl(210, 80%, 65%)
Ícone interno: lupa ou pessoa em vez de casa
```

**Arquivos modificados:** 6 arquivos + 1 migração + 1 nova página

| Arquivo | Acao |
|---|---|
| Migração SQL | Criar tabela `buyer_profiles` com RLS |
| `src/pages/RegisterBuyer.tsx` | Nova página com formulário de cadastro de comprador |
| `src/App.tsx` | Adicionar rota `/cadastrar-comprador` |
| `src/components/layout/Header.tsx` | Adicionar link "Cadastrar Comprador" no menu |
| `src/components/map/BusinessMap.tsx` | Aceitar buyers, marcadores azuis, popups, legenda |
| `src/pages/MapView.tsx` | Buscar buyer_profiles e passar para BusinessMap |
| `src/components/map/MapFilterSidebar.tsx` | Filtro "Tipo" (Vendedores/Compradores) |

