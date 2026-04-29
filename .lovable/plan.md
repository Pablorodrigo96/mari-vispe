# Expansão da Integração com Base Nacional de CNPJ

## Objetivo
Mapear exaustivamente o banco externo de CNPJ e expandir a função `national-search` para retornar dados ricos (endereço completo, sócios, idade da empresa, natureza jurídica, regime tributário) que auto-preencham o wizard de venda e outros fluxos.

## Fase 1 — Auditoria do banco externo
Reescrever `supabase/functions/cnpj-db-inspect/index.ts` para:
- Listar todas as tabelas/views do schema `public` do banco externo
- Para cada tabela: colunas, tipos, contagem aproximada (`pg_class.reltuples`)
- Amostras (3 linhas) das tabelas-chave: `empresas`, `estabelecimentos`, `socios`, `simples`, `cnaes`, `municipios`, `naturezas`, `qualificacoes`, `paises`, `motivos`
- Detectar chaves de junção (CNPJ básico de 8 dígitos vs CNPJ completo de 14)
- Salvar resultado em `docs/CNPJ_DATA_MAP.md` (gerado a partir do output da função)

## Fase 2 — Documentação do mapa
Criar `docs/CNPJ_DATA_MAP.md` com:
- Diagrama de relacionamento (ASCII)
- Dicionários de códigos: situação cadastral, natureza jurídica, qualificação de sócio, porte, opção pelo Simples
- Estratégia de JOIN para perfil completo

## Fase 3 — Expansão de `national-search` (case `cnpj`)
Refatorar a query SQL para JOINs e retornar:
- **Identificação**: razão social, nome fantasia, CNPJ, situação decodificada, data abertura, idade em anos
- **Natureza jurídica**: código + descrição (LTDA, SA, MEI, EIRELI…)
- **Porte**: ME, EPP, Demais
- **Endereço completo**: tipo logradouro, logradouro, número, complemento, bairro, CEP, município (nome via JOIN), UF
- **Contato**: telefone (DDD+número), email
- **CNAE**: principal (código + descrição) e secundários (array)
- **Sócios (QSA)**: nome, qualificação decodificada, % participação, data entrada
- **Simples/MEI**: optante, data opção, data exclusão
- **Capital social**

Manter retrocompatibilidade com os campos atuais.

## Fase 4 — Cache local
Criar tabela `cnpj_cache` em Lovable Cloud:
- `cnpj` (PK, 14 dígitos)
- `data` (jsonb com payload completo)
- `cached_at` (timestamp)
- TTL: 30 dias (verificado em código)
- RLS: leitura pública, escrita só service_role
- Reduz latência e carga no banco externo

## Fase 5 — Integração no wizard
Atualizar `StepBasicInfo`, `StepLocation`, `StepContact`, `StepFinancials`:
- Auto-preencher: razão social, nome fantasia, CEP, rua, número, bairro, cidade, UF, telefone, ano de fundação
- Badge "Dados da Receita Federal" (verde) ao lado dos campos preenchidos
- Permitir edição (badge some ao editar)
- Mostrar painel lateral opcional com sócios + CNAE (informativo)

## Detalhes técnicos
- Banco externo: PostgreSQL via `deno-postgres` com a connection string já configurada no secret `CNPJ_DB_URL`
- Códigos de situação cadastral: `01`=Nula, `02`=Ativa, `03`=Suspensa, `04`=Inapta, `08`=Baixada
- CNPJ básico (8 dígitos) é a chave de junção entre `empresas` ↔ `estabelecimentos` ↔ `socios` ↔ `simples`
- Município é referenciado por código IBGE em `estabelecimentos.municipio` → JOIN com `municipios.codigo`
- Natureza jurídica: JOIN `empresas.natureza_juridica` → `naturezas.codigo`
- Qualificação do sócio: JOIN `socios.qualificacao_socio` → `qualificacoes.codigo`

## Entregáveis
1. `cnpj-db-inspect` reescrita com auditoria completa
2. `docs/CNPJ_DATA_MAP.md` com mapa real do schema
3. `national-search` expandida com JOINs e dados decodificados
4. Tabela `cnpj_cache` + lógica de cache
5. UI do wizard auto-preenchendo todos os campos disponíveis com badge de origem

## Sequência de execução
Fase 1 → rodar inspect → preencher Fase 2 → Fase 3 → Fase 4 → Fase 5. Cada fase é validada antes da próxima.