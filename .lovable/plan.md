# Expansão da Integração com Base Nacional de CNPJ — REVISADO

## Auditoria concluída (Fase 1)

Banco externo tem **apenas 4 objetos** no schema `public`:

| Objeto | Tipo | Linhas | Conteúdo |
|---|---|---|---|
| `cnaes` | tabela | 1.359 | código + descrição |
| `empresas` | tabela | 4.511.699 | cnpj_basico, razao_social, natureza_juridica, qualificacao_responsavel, capital_social, porte_empresa, ente_federativo |
| `estabelecimentos` | tabela | 5.491.329 | dados completos do estabelecimento (endereço, CNAE, situação, contato) |
| `estabelecimentos_detalhados` | **view** | — | JOIN pronto: razao_social + nome_fantasia + porte + capital + endereco_completo + CEP + UF + municipio (nome) + cnae + cnae_descricao + telefone_formatado + email |

**Não disponível na fonte**: socios (QSA), simples/MEI, naturezas (descrições), qualificacoes, municipios (códigos IBGE→nome separados), motivos, paises.

**Códigos a decodificar no código**:
- `situacao_cadastral`: 01=Nula, 02=Ativa, 03=Suspensa, 04=Inapta, 08=Baixada
- `porte_empresa`: 00=Não informado, 01=Micro Empresa, 03=EPP, 05=Demais
- `identificador_matriz_filial`: 1=Matriz, 2=Filial
- `natureza_juridica`: deixar código bruto (1359 valores — tabela estática só com top 30 mais comuns: 2062=LTDA, 2305=SA, 2135=EIRELI, 2143=Empresário Individual, 2240=SS, 2348=MEI…)

## Plano revisado

### Fase 3 — `national-search` expandida (case `cnpj`)
- Usar a **view `estabelecimentos_detalhados`** como fonte primária (1 query, sem JOIN manual)
- Decodificar `situacao_cadastral`, `porte_empresa`, `natureza_juridica` (top 30) via mapas no código
- Calcular `idade_anos` a partir de `data_inicio_atividade` (formato YYYYMMDD)
- Retornar payload retrocompatível + novos campos: `nome_fantasia`, `endereco_completo`, `logradouro`, `numero`, `complemento`, `bairro`, `cep`, `municipio`, `uf`, `telefone`, `email`, `capital_social`, `porte`, `porte_codigo`, `natureza_juridica_codigo`, `natureza_juridica_descricao`, `data_abertura` (ISO), `idade_anos`, `situacao_codigo`, `situacao`, `cnae_principal_codigo`, `cnae_principal_descricao`, `cnae_secundarios` (array de códigos), `is_matriz`

### Fase 4 — Cache local
Tabela `cnpj_cache` no Lovable Cloud:
- `cnpj` text PK
- `data` jsonb
- `cached_at` timestamptz default now()
- TTL: 30 dias verificado em código
- RLS: SELECT público; INSERT/UPDATE só service_role

### Fase 5 — UI no wizard de venda
- `StepBasicInfo`: razao_social, nome_fantasia, foundation_year (de data_abertura)
- `StepLocation`: cep, street (= tipo_logradouro+logradouro), neighborhood, city, state
- `StepContact`: phone (telefone_formatado)
- Badge verde "Receita Federal" ao lado dos campos preenchidos; some ao editar

## Itens removidos do plano original
- ❌ Sócios (QSA) — não existe na base
- ❌ Simples/MEI — não existe
- ❌ JOINs manuais com municipios/naturezas/qualificacoes — view já resolve
- ❌ `docs/CNPJ_DATA_MAP.md` separado — virou esta seção do plano

## Sequência
Fase 3 (national-search) → Fase 4 (cache) → Fase 5 (UI wizard).
