## Objetivo

Cobrir os dados que **não existem** na sua base nacional atual (sócios/QSA, regime tributário Simples/MEI) seguindo dois caminhos em paralelo:

1. **Caminho permanente** — você pede ao fornecedor da base para incluir as tabelas faltantes (ação manual sua, fora do código).
2. **Caminho imediato** — eu implemento um **fallback automático via BrasilAPI** (gratuita, sem API key) que busca QSA e Simples só quando o CNPJ não tiver esses dados na base local.

Quando o fornecedor entregar as tabelas, basta avisar — desligo o fallback em 1 linha.

---

## Parte 1 — O que VOCÊ faz (caminho permanente)

Mande este pedido ao seu fornecedor da base CNPJ:

> "Por favor, incluam no próximo dump mensal as tabelas `socios` e `simples` que a Receita Federal já disponibiliza gratuitamente junto com `empresas` e `estabelecimentos` no mesmo pacote público (https://dadosabertos.rfb.gov.br/CNPJ/). Precisamos dos campos:
> - **socios**: cnpj_basico, identificador_socio, nome_socio, cnpj_cpf_socio, qualificacao_socio, data_entrada_sociedade, pais, representante_legal, qualificacao_representante, faixa_etaria
> - **simples**: cnpj_basico, opcao_pelo_simples, data_opcao_simples, data_exclusao_simples, opcao_pelo_mei, data_opcao_mei, data_exclusao_mei
> 
> Também seria útil as tabelas de domínio: `municipios`, `naturezas_juridicas`, `paises`, `qualificacoes_socios`, `motivos`."

Custo: **zero** (a Receita disponibiliza tudo grátis).

---

## Parte 2 — O que EU faço (caminho imediato: fallback BrasilAPI)

### 2.1 — Atualizar `supabase/functions/national-search/index.ts`

No fluxo `type === "cnpj"`, **depois** de consultar a base local, fazer uma chamada paralela à BrasilAPI para enriquecer com:
- **QSA** (sócios) — endpoint `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` retorna o array `qsa`
- **Simples/MEI** — mesmo endpoint retorna `opcao_pelo_simples`, `data_opcao_pelo_simples`, `opcao_pelo_mei`, `data_opcao_pelo_mei`

Estratégia:
- Chamada com timeout curto (3s) — se a BrasilAPI falhar, retorna apenas dados locais (graceful degradation)
- Resultado mesclado é salvo no `cnpj_cache` (TTL 30 dias) — então segunda consulta do mesmo CNPJ não chama a BrasilAPI de novo
- Nenhum custo, nenhuma API key, sem rate limit relevante para uso individual de auto-preenchimento

### 2.2 — Estender o tipo `NationalCompany` em `src/hooks/useNationalSearch.ts`

Adicionar campos opcionais:
```ts
socios?: Array<{
  nome: string;
  qualificacao: string;
  data_entrada: string;
  cpf_cnpj?: string;
  faixa_etaria?: string;
}>;
regime_tributario?: {
  simples: boolean;
  data_opcao_simples?: string;
  mei: boolean;
  data_opcao_mei?: string;
};
data_source_qsa?: 'local' | 'brasilapi' | 'unavailable';
data_source_simples?: 'local' | 'brasilapi' | 'unavailable';
```

### 2.3 — Exibir os novos dados no wizard de venda

Em `src/components/sell/wizard/StepBasicFinancial.tsx`, após o auto-preenchimento por CNPJ, mostrar (read-only, recolhível):
- **Quadro Societário** — lista de sócios com nome, qualificação e data de entrada
- **Regime Tributário** — badge "Simples Nacional" / "MEI" / "Lucro Real/Presumido (não optante)"

Esses blocos só aparecem quando há dados (`socios.length > 0` ou `regime_tributario` definido), com pequena legenda discreta indicando a fonte ("Dados públicos Receita Federal").

### 2.4 — Painel de admin para monitorar

Pequeno indicador no `cnpj-db-inspect` ou novo endpoint que conte:
- Quantos CNPJs no `cnpj_cache` vieram só da base local vs. enriquecidos via BrasilAPI
- Útil para você saber quando o fornecedor entregar as tabelas e poder desligar o fallback

### 2.5 — Switch para desligar fallback (1 linha)

Adicionar flag em `integrations_config`:
```
key='brasilapi_fallback_enabled', value='true'
```
Quando suas tabelas chegarem, basta mudar para `false` na admin (sem deploy).

---

## Detalhes técnicos

**Por que BrasilAPI (e não ReceitaWS/CNPJá):**
- Grátis, sem API key, sem captcha
- Mantida pela comunidade, hospedada em CDN, latência ~500ms
- Usa a mesma fonte oficial (Receita Federal)
- Limite informal de ~3 req/s — mais que suficiente para auto-preenchimento individual; cache de 30 dias absorve picos

**Falhas esperadas e tratamento:**
- Timeout/erro de rede → retorna sem QSA, registra `data_source_qsa: 'unavailable'`, segue normalmente
- CNPJ não encontrado na BrasilAPI mas existe localmente → mostra dados locais sem QSA
- Cache hit → não chama BrasilAPI

**Sem mudanças de schema necessárias** — o `cnpj_cache.data` é `jsonb`, então os novos campos cabem sem migração.

---

## Resultado final

Quando o usuário digitar um CNPJ no wizard de venda, vai ver auto-preenchido:
- Razão social, fantasia, endereço, CNAE, idade, capital social, situação cadastral, natureza jurídica, contato (já existem hoje)
- **+ Sócios (QSA)** — novo, via BrasilAPI até fornecedor entregar
- **+ Regime tributário (Simples/MEI)** — novo, via BrasilAPI até fornecedor entregar

Quando o fornecedor entregar as tabelas, eu reescrevo o JOIN no SQL para puxar localmente (mais rápido) e desligo o fallback.

Posso aprovar?