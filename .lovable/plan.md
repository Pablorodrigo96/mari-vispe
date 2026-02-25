

## Blind Teaser - Landing Page por Empresa

### Objetivo
Ao concluir o cadastro de uma empresa, gerar automaticamente uma landing page publica no estilo "Blind Teaser" (sem revelar o nome da empresa), com URL unica por listing. A identidade visual segue o padrao do PDF de referencia: fundo escuro, acentos dourados, tipografia bold, layout em secoes full-width.

---

### Estrutura do Blind Teaser (5 secoes inspiradas no PDF)

```text
+--------------------------------------------------+
| SECAO 1 - HERO (fundo preto, acento dourado)      |
| "Blind Teaser"                                    |
| Codigo: [TICKER gerado] ex: TECH01               |
| Logo PME.B3                                       |
+--------------------------------------------------+
| SECAO 2 - INTRODUCAO                              |
| Fundada em [ano], a empresa atua no segmento de   |
| [categoria] na regiao de [cidade], [estado].      |
| Descricao do negocio (texto do listing).          |
| Badge: "Operacao em [UF]"                         |
+--------------------------------------------------+
| SECAO 3 - FINANCEIRO                              |
| Cards dourados com:                               |
| - Faturamento Anual: R$ X                         |
| - Lucro Anual: R$ X                               |
| - Margem Liquida: X%                              |
| - Valor Pedido: R$ X (ou "Sob Consulta")          |
| - Faturamento Medio Mensal (calculado)            |
+--------------------------------------------------+
| SECAO 4 - DETALHES DO PONTO (se houver dados)    |
| Cards brancos sobre fundo com imagem:             |
| - Area: X m2                                      |
| - Aluguel: R$ X/mes                               |
| - IPTU: R$ X/mes                                  |
| - Motivo da Venda                                 |
+--------------------------------------------------+
| SECAO 5 - CTA / CONTATO                          |
| Formulario de contato (mesmo do ListingDetail)    |
| Botao WhatsApp                                    |
| Disclaimer de confidencialidade                   |
| Logo PME.B3                                       |
+--------------------------------------------------+
```

### Geracao do Ticker
Cada listing recebe um codigo anonimo baseado na categoria + sequencial. Ex: `TECH01`, `FOOD03`, `SERV12`. Sera gerado no momento do cadastro e armazenado na tabela `listings` em um novo campo `ticker`.

---

### Arquivos a criar

#### 1. `src/pages/BlindTeaser.tsx`
Pagina publica (sem Header/Footer tradicionais) com layout full-screen em secoes:
- Busca listing pelo `ticker` na URL (`/teaser/:ticker`)
- Usa a view `public_listings` (nao expoe user_id/dados senseiveis)
- Layout dark premium com gradientes, acentos dourados
- Responsivo (mobile-first)
- Secoes: Hero, Introducao, Financeiro, Ponto Comercial (condicional), CTA/Contato

#### 2. `src/components/teaser/TeaserHero.tsx`
Secao hero com fundo preto, linhas douradas decorativas, titulo "Blind Teaser", ticker da empresa, logo PME.B3

#### 3. `src/components/teaser/TeaserIntro.tsx`
Secao de introducao com descricao do negocio, badge de localizacao (estado), ano de fundacao, categoria

#### 4. `src/components/teaser/TeaserFinancials.tsx`
Secao financeira com cards estilo dourado/gradiente mostrando faturamento anual, lucro, margem, valor pedido, faturamento medio mensal

#### 5. `src/components/teaser/TeaserDetails.tsx`
Secao de detalhes do ponto comercial (condicional - so aparece se houver dados de m2, aluguel, etc.)

#### 6. `src/components/teaser/TeaserContact.tsx`
Secao de contato com formulario, botao WhatsApp, e disclaimer de confidencialidade

### Arquivos a modificar

#### 7. `src/App.tsx`
- Adicionar rota `/teaser/:ticker` apontando para `BlindTeaser`

#### 8. `src/components/sell/wizard/NewListingWizard.tsx`
- Apos criar o listing com sucesso, redirecionar para a pagina do Blind Teaser em vez da pagina de detalhe (`/teaser/:ticker`)
- Gerar o ticker automaticamente antes do insert

### Migracao de banco de dados

Adicionar campo `ticker` a tabela `listings`:
- `ticker TEXT UNIQUE` — codigo anonimo unico (ex: "TECH01")
- Atualizar a view `public_listings` para incluir o campo `ticker`
- Gerar tickers para listings existentes via migration

---

### Secao Tecnica

**Geracao do ticker:**
```text
1. Mapear categoria para prefixo (tech->TECH, food->FOOD, etc.)
2. Contar listings existentes daquela categoria
3. Gerar: PREFIXO + (count + 1).toString().padStart(2, '0')
4. Verificar unicidade, incrementar se necessario
```

**Dados usados do listing para o Blind Teaser:**
- `title` — NAO exibido (e blind)
- `category` — exibido como setor
- `foundation_year` — exibido se disponivel
- `state`, `city` — exibidos (cidade pode ser omitida se preferir)
- `description` — exibido integralmente
- `annual_revenue`, `annual_profit` — exibidos com formatacao
- `asking_price`, `hide_price` — condicional
- `square_meters`, `rent_value`, `iptu_value` — condicional
- `sale_reason` — exibido
- `images` — NAO exibidas (e blind teaser, sem identificacao visual)

**Identidade visual (baseada no PDF):**
- Background: `bg-gray-950` / `bg-black`
- Acentos: gradiente dourado (`from-amber-500 to-yellow-600`)
- Tipografia: bold, uppercase para titulos de secao
- Cards financeiros: fundo gradiente dourado com texto escuro
- Separadores e linhas decorativas douradas
- Glassmorphism em cards secundarios

| Arquivo | Acao |
|---|---|
| Migracao SQL | Adicionar campo `ticker` + atualizar view `public_listings` |
| `src/pages/BlindTeaser.tsx` | Criar |
| `src/components/teaser/TeaserHero.tsx` | Criar |
| `src/components/teaser/TeaserIntro.tsx` | Criar |
| `src/components/teaser/TeaserFinancials.tsx` | Criar |
| `src/components/teaser/TeaserDetails.tsx` | Criar |
| `src/components/teaser/TeaserContact.tsx` | Criar |
| `src/App.tsx` | Adicionar rota `/teaser/:ticker` |
| `src/components/sell/wizard/NewListingWizard.tsx` | Gerar ticker e redirecionar para teaser |

