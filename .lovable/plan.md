
## Integração com Base Nacional de 5M Empresas Brasileiras

### O que foi descoberto no Deal Flow AI

O projeto Deal Flow AI já possui toda a infraestrutura funcionando. O plano é **portar exatamente essa implementação** para o Vispe, adaptando-a ao contexto do marketplace. Não é necessário reinventar nada — apenas copiar, adaptar e conectar.

---

### Arquitetura da Integração

O banco externo é um PostgreSQL da Receita Federal com duas tabelas:
- `estabelecimentos` — dados do CNPJ (filial/matriz, CNAE, município, estado, situação cadastral)
- `empresas` — dados da empresa-mãe (razão social, capital social, porte)

A conexão é feita via **string de conexão PostgreSQL direta** (não via Supabase API), guardada no secret `EXTERNAL_DB_URL`.

```text
Usuário (plano pago)
        │
        │ supabase.functions.invoke("national-search")
        ▼
  Edge Function national-search
        │
        ├── Valida JWT do usuário
        ├── Verifica plano pago na tabela subscriptions
        ├── Aplica filtros: estado, setor (CNAE), porte
        │
        └── Conecta via PostgreSQL (EXTERNAL_DB_URL)
                    │
                    ▼
          Base Receita Federal
          5M empresas ATIVAS
          (estabelecimentos + empresas)
```

---

### O que será criado/modificado

#### 1. Secret: `EXTERNAL_DB_URL`
Connection string PostgreSQL do banco externo. Será configurado de forma segura — nunca aparece no código.

#### 2. Edge Function: `national-search` (nova, portada do Deal Flow AI)
Arquivo: `supabase/functions/national-search/index.ts`

Diferenças em relação ao Deal Flow AI:
- Adiciona verificação de plano pago (tabela `subscriptions`)
- Mapeia setores do banco externo para as categorias do Vispe (`food`, `health`, `tech`, `commerce`, `industry`, `education`, `logistics`, `services`, `telecom`)
- Retorna formato compatível com os componentes existentes do Vispe

Parâmetros aceitos:
- `{ type: "search", query: "Padaria", state: "SP", limit: 20 }` — busca por nome/razão social
- `{ type: "cnpj", cnpj: "12345678000199" }` — busca CNPJ exato para autocomplete
- `{ type: "sector", category: "food", state: "MG", limit: 30 }` — busca por setor/categoria

#### 3. Arquivo auxiliar: `supabase/functions/national-search/rf-municipios.ts`
Copiado integralmente do Deal Flow AI — mapeamento de 5.570 códigos de municípios da Receita Federal para nomes legíveis.

#### 4. Hook: `src/hooks/useNationalSearch.ts` (novo)
Hook React para consumir a nova Edge Function. Gerencia:
- Estado de loading/erro/resultados
- Verificação local se o usuário tem plano pago antes de exibir a UI
- Debounce de 500ms para busca por texto

#### 5. Componente: `src/components/matching/NationalSearchPanel.tsx` (novo)
Painel de busca na base nacional, integrado à página `/matching`. Funcionalidades:
- Campo de busca por nome da empresa
- Filtro por estado (UF)
- Filtro por categoria (mapeada para CNAE)
- Resultados exibindo: razão social, CNAE, cidade/estado, porte, capital social estimado
- Para usuários sem plano pago: banner de upgrade com botão para planos

#### 6. Integração no formulário de anúncio: `src/components/sell/wizard/StepBasicFinancial.tsx`
Ao digitar o CNPJ no wizard de cadastro:
- Dispara `national-search` com `type: "cnpj"` após 14 dígitos preenchidos
- Se encontrar, preenche automaticamente: título (razão social), cidade, estado e categoria
- Exibe feedback visual ("Empresa encontrada na base nacional!")
- Funciona para qualquer usuário logado (não requer plano pago — é autocomplete de uso interno)

#### 7. `supabase/config.toml` (editar)
Registrar a nova função:
```toml
[functions.national-search]
verify_jwt = false
```

---

### Mapeamento CNAE → Categorias do Vispe

| CNAE (prefixos) | Setor Receita Federal | Categoria Vispe |
|---|---|---|
| 01, 02, 03 | Agropecuária | `commerce` |
| 10–33 | Indústria | `industry` |
| 41–43 | Construção | `services` |
| 45–47 | Comércio | `commerce` |
| 49–53 | Logística/Transporte | `logistics` |
| 55–56 | Alimentação/Hospedagem | `food` |
| 58–63 | TI/Comunicação | `tech` |
| 60–61 | Telecom | `telecom` |
| 64–70 | Finanças | `services` |
| 75, 86–88 | Saúde | `health` |
| 85 | Educação | `education` |
| Demais | Outros | `services` |

---

### Controle de acesso

| Usuário | Busca Nacional | Autocomplete CNPJ |
|---|---|---|
| Não logado | Bloqueado (401) | Bloqueado |
| Logado, plano `free` | Bloqueado (403) + banner de upgrade | Liberado |
| Logado, plano pago | Liberado | Liberado |
| Admin | Liberado | Liberado |

---

### O que você precisa fornecer

Apenas **1 secret**:
- `EXTERNAL_DB_URL` — a connection string PostgreSQL do banco da Receita Federal (mesma que já está configurada no Deal Flow AI)

Formato: `postgresql://usuario:senha@host:porta/banco`

---

### Arquivos criados/modificados

| Arquivo | Ação |
|---|---|
| `supabase/functions/national-search/index.ts` | Criar (portado + adaptado) |
| `supabase/functions/national-search/rf-municipios.ts` | Criar (copiado do Deal Flow AI) |
| `supabase/config.toml` | Editar (registrar função) |
| `src/hooks/useNationalSearch.ts` | Criar |
| `src/components/matching/NationalSearchPanel.tsx` | Criar |
| `src/pages/Matching.tsx` | Editar (adicionar NationalSearchPanel) |
| `src/components/sell/wizard/StepBasicFinancial.tsx` | Editar (autocomplete CNPJ) |

**Nenhuma migração de banco de dados necessária.** Todo o acesso é via Edge Function + secret seguro.
