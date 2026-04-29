# Mapear 100% da base nacional de CNPJs e expandir o auto-preenchimento

## Objetivo

Confirmar **exatamente** quais tabelas/colunas existem no banco externo de CNPJs, validar os relacionamentos que você descreveu, e então expandir a função `national-search` para devolver muito mais dados (endereço, idade, sócios, telefone, natureza jurídica, etc.) — preenchendo automaticamente todos os campos possíveis nos formulários de **Vender empresa**, **Captação de capital** e **Cadastro de comprador**.

## Fase 1 — Auditoria do banco externo (reuso do `cnpj-db-inspect`)

Reescrevo o edge function `cnpj-db-inspect` para devolver:

1. **Lista completa de tabelas e views** do schema `public` (com tipo: TABLE/VIEW).
2. **Todas as colunas** de cada tabela (nome + tipo).
3. **Contagem aproximada** de linhas (via `pg_class.reltuples`, instantâneo).
4. **Uma linha de amostra** de cada tabela principal (`estabelecimentos`, `empresas`, `cnaes`, e tentativa em `socios`, `simples`, `motivos`, `municipios`, `paises`, `qualificacoes`, `naturezas`, `estabelecimentos_detalhados`).

Isso me confirma:
- Se `socios` (QSA) realmente existe nessa instância e quais campos tem (CPF/CNPJ do sócio, nome, % participação, qualificação, data de entrada).
- Se `simples` (opção pelo Simples Nacional / MEI) está disponível.
- Quais tabelas auxiliares existem para decodificar códigos: `municipios`, `paises`, `motivos` (motivo da situação cadastral), `naturezas` (natureza jurídica), `qualificacoes` (qualificação do sócio).
- A estrutura real da view `estabelecimentos_detalhados` (que parece já fazer pré-join).

## Fase 2 — Documentar o mapa de dados

Com base no resultado da Fase 1, gero um documento `docs/CNPJ_DATA_MAP.md` com:

- Diagrama textual das relações (CNPJ básico = chave, ordem+dv compõem CNPJ completo).
- Lista por tabela com: nome em PT-BR, tipo, propósito, e se "uso hoje" / "vou passar a usar" / "decodifica via X".
- Mapeamento `código → nome legível` para: situação cadastral (01/02/03/04/08), porte (00/01/03/05), natureza jurídica, motivo de baixa, qualificação de sócio.

## Fase 3 — Expandir `national-search` (caso `type: "cnpj"`)

Refatoro a query de lookup por CNPJ para retornar (todos os campos confirmados na Fase 1):

**Identificação**
- razao_social, nome_fantasia, cnpj completo, matriz/filial

**Atividade**
- cnae_principal (código + descrição via JOIN com `cnaes`)
- cnaes_secundarios (lista código + descrição)

**Status**
- situacao_cadastral (decodificada: Ativa/Suspensa/Inapta/Baixada)
- data_situacao_cadastral
- motivo_situacao (se baixada/inapta — decodificado)
- data_inicio_atividade → calcula **idade da empresa em meses/anos**

**Endereço completo**
- tipo_logradouro + logradouro + numero + complemento + bairro + cep + municipio (nome) + uf + pais

**Contato**
- telefone_1 (DDD + número), telefone_2, email (correio_eletronico)

**Estrutura jurídica**
- natureza_juridica (código + descrição)
- ente_federativo (se órgão público)
- capital_social
- porte_empresa (decodificado)

**Regime tributário** (se tabela `simples` existir)
- opcao_simples (S/N + data)
- opcao_mei (S/N + data)

**Sócios (QSA)** (se tabela `socios` existir)
- Lista de sócios: nome, qualificação (decodificada), data_entrada, % participação, faixa etária

## Fase 4 — Auto-preencher formulários

Atualizo os componentes para consumir os novos campos:

| Tela | Campos novos preenchidos |
|---|---|
| `StepBasicInfo` (Vender) | razão social, nome fantasia, CNAE com descrição, idade da empresa, natureza jurídica |
| `StepLocation` (Vender) | CEP, rua, número, complemento, bairro, cidade, UF |
| `StepContact` (Vender) | telefone (se vazio), email (se vazio) |
| `CapitalLeadModal` | tudo acima + faixa de porte e capital social como contexto de score |
| `RegisterBuyer` | razão social, cidade/UF, setor (CNAE→categoria) |

Todos os campos auto-preenchidos ficam **editáveis** (nunca read-only) e mostram um pequeno selo "preenchido pela Receita Federal" para o usuário entender de onde veio.

## Fase 5 — Cache (opcional, ganho de performance)

Adiciono uma tabela `public.cnpj_cache` no Lovable Cloud (não na base externa) com:
- cnpj (PK), payload (jsonb), fetched_at (timestamp), ttl 30 dias
- Antes de chamar a base externa, verifico cache. Reduz custo e latência em CNPJs já consultados.

## Decisões técnicas

- **Mantém `Deno.land/x/postgres@v0.17.0`** (já funciona).
- **Lê do secret `EXTERNAL_DB_URL`** (sem hardcode).
- **Decodificação de códigos**: para campos de baixa cardinalidade (situação, porte) faço hardcode em TS (rápido); para alta cardinalidade (CNAE, município, natureza) faço LEFT JOIN com a tabela auxiliar.
- **Privacidade dos sócios**: CPF dos sócios na base RF vem **mascarado** (`***123456**`). Devolvo como vem, sem desmascarar.
- **Performance**: 1 única query com todos os JOINs em vez de N round-trips. Index esperado: `(cnpj_basico)` em todas.

## Entregáveis

1. `cnpj-db-inspect/index.ts` reescrito (auditoria completa).
2. `docs/CNPJ_DATA_MAP.md` (documento humano com tudo que está disponível).
3. `national-search/index.ts` com query expandida para `type: "cnpj"`.
4. Atualizações em `StepLocation`, `StepBasicInfo`, `StepContact`, `CapitalLeadModal`, `RegisterBuyer` para consumir os campos novos.
5. (Opcional Fase 5) Migration `cnpj_cache` + lógica de cache na função.
