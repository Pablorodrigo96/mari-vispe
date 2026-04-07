

## Plano: Upload em Massa de Anúncios via Planilha

### Objetivo
Permitir que advisors (e admins/franqueados) façam upload de uma planilha Excel (.xlsx) com múltiplas empresas de uma só vez, criando todos os listings automaticamente no banco de dados.

---

### Estrutura da Planilha

A planilha terá as seguintes colunas (uma empresa por linha):

| Coluna | Obrigatória | Exemplo |
|---|---|---|
| titulo | Sim | Padaria Premium - Centro SP |
| categoria | Sim | food |
| descricao | Sim | Padaria com 15 anos de mercado... (min 100 chars) |
| faturamento_anual | Sim | 1200000 |
| lucro_anual | Sim | 240000 |
| valor_pedido | Sim | 800000 |
| cidade | Sim | São Paulo |
| estado | Sim | SP |
| motivo_venda | Sim | retirement |
| cep | Nao | 01310-100 |
| bairro | Nao | Bela Vista |
| rua | Nao | Rua Augusta |
| ano_fundacao | Nao | 2010 |
| cnpj | Nao | 12.345.678/0001-90 |
| metros_quadrados | Nao | 150 |
| valor_aluguel | Nao | 5000 |
| valor_iptu | Nao | 800 |
| ocultar_preco | Nao | sim/nao |
| info_adicional | Nao | Texto livre |
| video_url | Nao | https://youtube.com/... |

Categorias validas: tech, commerce, industry, services, food, health, education, logistics, telecom, energy, construction, agro

Motivos de venda validos: retirement, relocation, new_venture, health, partnership, other

---

### Mudancas

#### 1. Botao "Download Modelo" + "Upload Planilha"
Na pagina `MyListings.tsx`, ao lado dos botoes existentes ("Novo Anuncio", "Cadastrar Comprador"), adicionar:
- Botao "Baixar Modelo" que gera e baixa um .xlsx modelo com headers e 1 linha de exemplo
- Botao "Upload em Lote" que abre file picker para .xlsx

#### 2. Novo componente `BulkUploadDialog`
- Aceita arquivo .xlsx
- Parseia com a lib `xlsx` (SheetJS) no client-side
- Valida cada linha (campos obrigatorios, categoria valida, lucro <= faturamento)
- Mostra preview: quantas empresas validas vs com erro
- Linhas com erro sao destacadas com o motivo
- Botao "Enviar X empresas" que faz batch insert no Supabase
- Todas entram com `status: 'pending'` e `plan: 'basic'`

#### 3. Processamento
- Cada linha vira um `INSERT` na tabela `listings` com `user_id` do usuario logado
- Valores monetarios sao convertidos de string/numero para numeric
- Apos sucesso, toast com "X anuncios criados com sucesso!"
- Recarrega a lista de anuncios

---

### Secao Tecnica

**Dependencia**: instalar `xlsx` (SheetJS) para parsear .xlsx no browser

**Arquivos modificados/criados:**

| Arquivo | Acao |
|---|---|
| `package.json` | Adicionar dependencia `xlsx` |
| `src/components/sell/BulkUploadDialog.tsx` | Novo componente: upload, parse, validacao, preview, batch insert |
| `src/pages/MyListings.tsx` | Adicionar botoes "Baixar Modelo" e "Upload em Lote" |

**Nenhuma migracao SQL necessaria** - usa a tabela `listings` existente.

**Validacao client-side por linha:**
- titulo min 10 chars
- descricao min 100 chars
- categoria in lista valida
- lucro <= faturamento
- cidade e estado preenchidos
- motivo_venda in lista valida

