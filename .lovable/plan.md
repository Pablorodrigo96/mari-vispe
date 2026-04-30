## Auditoria — Planilha Monday vs sistema de import

Boa notícia: a planilha tem dados riquíssimos (48 empresas + 179 buyers + 115 mandates + 450 contatos). Má notícia: **se você apertar "Importar" hoje, ~80% dos dados são rejeitados** por descasamentos entre o template, o backend `eb-import` e os enums atuais do banco.

Diagnóstico completo abaixo, com as 7 correções que tornam o import 100% operacional.

---

### Volume da planilha

| Aba | Linhas | Status atual de import |
|---|---|---|
| companies | 48 | **0 vão entrar** (sem CNPJ) |
| buyers | 179 | **0 vão entrar** (`tipo` quebra check do banco) |
| mandates | 115 | **~52 vão entrar** (62 falham por valor_pedido vazio + 1 por CNPJ truncado) |
| contacts | 450 | **0 vão entrar** (entity_id vem como nome, coluna espera UUID) |
| activities | 1 | só a linha-exemplo do template |

---

### Problemas encontrados (em ordem de impacto)

**P1 — Companies sem CNPJ (48 de 48)**
A coluna `cnpj` está 100% vazia. O backend rejeita tudo que não tem 14 dígitos. Existem 2 caminhos:
- (A) Você vai à Receita e preenche os 48 CNPJs antes de subir.
- (B) Eu reescrevo o backend para aceitar `cnpj` opcional em companies, gerando um identificador interno temporário (ex: `MARI-MONDAY-####`) e marcando como `pending_cnpj` para você completar depois pelo CRM.

**P2 — Mandates: tipo `tipo` de buyer e `setor_ma` em texto livre**
A planilha tem 23 valores únicos de `setor_ma` em mandates incluindo combinações ("Telecomunicações, Serviços de TI"). O backend hoje só copia a string crua para uma coluna text livre — vai entrar, mas vira sopa para filtros e matching. Precisa normalizar (split por vírgula, primeiro valor vira principal, resto vira tags).

**P3 — Buyers: valor de `tipo` viola o schema**
Planilha tem: `Telecomunicações`, `Alimentação e Bebidas`, `Serviços de TI...`, `Financeiro...`. Schema espera: `estrategico` | `financeiro` | `family_office`. O Postgres vai rejeitar **todos os 179 buyers**. O que o usuário está chamando de "tipo" na verdade é o **setor** do buyer. Precisa:
- mapear "Financeiro (Bancos, Seguros, Fintechs)" → `tipo='financeiro'`
- mapear o resto → `tipo='estrategico'` + jogar o nome do setor para `setores_interesse`

**P4 — Mandates: `valor_pedido` obrigatório (62 vazios)**
Backend hoje exige `valor_pedido > 0` e rejeita a linha. Para um CRM real, mandate sem valor ainda em originação é normal. Solução: tornar opcional (já que `data_vencimento` e `pipeline_stage` carregam o sentido), só logar warning.

**P5 — Mandates: 1 CNPJ com 13 dígitos**
Excel comeu o zero à esquerda do CNPJ `3576095000184` (deveria ser `03576095000184`). Solução: o backend já tem `onlyDigits()`; basta adicionar `.padStart(14, "0")` quando tiver 13 dígitos.

**P6 — Mandates: enums não batem (CRÍTICO)**
| Campo | Planilha tem | DB espera (enum) |
|---|---|---|
| `pipeline_stage` | `originacao` | `match` \| `nbo` \| `due_diligence` \| `spa` \| `closing` \| `closed` |
| `deal_type` | `sell_side` | `sellside` \| `buyside` \| `spa` \| ... |
| `status` | `ativo` | `vigente` \| `vencido` \| `vendemos` \| `em_negociacao` \| ... |
| `exclusividade` | `Sim`/`Não` (texto) | boolean NOT NULL |

O template `ebImportTemplates.ts` está **desatualizado** vs os enums atuais do banco. Como está agora, **115 de 115 mandates falham** com erro de enum. Solução: backend traduz pt-BR → enum:
- `originacao` → `match`
- `sell_side` → `sellside`
- `ativo` → `vigente`
- `Sim`/`sim`/`true` → true; `Não`/`não`/vazio → false

**P7 — Contacts: `entity_id` vem como nome em texto, coluna é `uuid`**
Catastrófico. 294 contatos de buyers têm `entity_id='NET FLEX'` (nome do buyer), mas a tabela `contacts.entity_id` é UUID. PostgreSQL vai rejeitar com erro de tipo em todas as 450 linhas.

Solução: backend resolve o nome → UUID **dentro do mesmo bundle**, na ordem certa:
1. Importa companies, mandates, buyers (gera mapa `nome → uuid` para buyers e `cnpj → uuid` para mandates/companies)
2. Em contacts, se `entity_type='buyer'` → look up por nome no mapa → substitui pelo UUID
3. Se `entity_type='mandates'` (planilha usa plural — também precisa aceitar) → look up por CNPJ ou por `razao_social`
4. Se `entity_type='companies'` → look up por CNPJ
5. Se não achar → erro claro `"buyer 'NET FLEX' não foi encontrado nesta planilha nem no banco"`

Bônus: planilha usa `mandates`/`companies`/`buyers` (plural), template diz `mandate`/`company`/`buyer` (singular). Backend tem que aceitar ambos.

**Outros achados menores**
- 6 contatos sem email nem telefone → backend rejeita. Aceitar só com nome+cargo.
- Mandate "GO | MS" no campo `uf` (multi-UF) — backend faz `.slice(0, 2)` e fica `"GO"`. Aceitável, mas perde info. Salvar `uf_principal` + jogar resto em `observacoes`.
- Tabela contacts tem `telefone_e164`, mas backend escreve em `telefone` (que não existe!). Vai falhar igual no insert. Renomear no backend.

---

### Plano de correção

**1. Reescrever `supabase/functions/eb-import/index.ts`** com:
- Tradução de enums pt-BR → valores do banco (mandates, buyers).
- Mapeamento `tipo` de buyer (texto livre → enum) preservando setor original em `setores_interesse`.
- Resolução de `entity_id` em contacts (nome/CNPJ → UUID dentro do bundle e/ou via lookup no DB).
- Aceitar `entity_type` no plural (`mandates`/`buyers`/`companies`).
- Padding de CNPJ para 14 (zero à esquerda).
- `valor_pedido` opcional em mandates.
- Companies sem CNPJ: gerar identificador interno `MARI-MONDAY-{seq}` armazenado em `external_ref`, marcar `qualification_status='pending_cnpj'` para enriquecer depois (preferível ao caminho A acima).
- Contatos sem email/telefone: aceitar (warning, não erro).
- Escrever em `telefone_e164` (coluna real), não `telefone`.

**2. Atualizar `src/lib/ebImportTemplates.ts`** para refletir:
- Valores corretos de enums nas instruções
- Aviso explícito sobre `entity_id` em contacts (pode ser nome do buyer OU UUID OU CNPJ)
- Cabeçalho `tipo` em buyers com guia de tradução

**3. Migration** para adicionar à `companies`:
- Coluna `external_ref text` (nullable, único parcial) para identificar empresas sem CNPJ
- Adicionar valor `pending_cnpj` ao enum `qualification_status` (se não existir)

**4. Após importar, gerar relatório** retornado pelo backend com:
- Contagem por entidade: criadas / atualizadas / ignoradas / erros
- Lista de "buyers não encontrados" para você revisar manualmente
- CSV anexo das linhas rejeitadas com motivo

**5. Validação no front (`ImportDialog`)** já faz dry-run — vai mostrar exatamente o que seria importado antes do commit. Esse fluxo continua, só passa a refletir os números reais.

---

### Resultado esperado após as correções

| Aba | Linhas | Após correção |
|---|---|---|
| companies | 48 | 48 entram (com `external_ref`, status `pending_cnpj`) |
| buyers | 179 | 179 entram (todos como `estrategico` + setor preservado) |
| mandates | 115 | 115 entram (CNPJ corrigido, enums traduzidos, valor opcional) |
| contacts | 450 | ~444 entram (6 sem contato vão como warning, opcionalmente aceitos) |

**Total: ~787 linhas operacionais migradas do Monday em um clique.**

Aprovando, executo as 5 etapas em sequência (migration → backend → template → teste com dry-run da própria planilha → relatório).