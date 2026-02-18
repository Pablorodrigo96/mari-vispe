

## Motor de Matching Automatico - PME.B3

### Visao Geral

Criar uma nova secao/pagina de **Matching Inteligente** onde o usuario digita o nome da empresa ou CNPJ, o sistema consulta o banco de dados externo (Supabase) para autocompletar os dados da empresa, exibe uma mensagem persuasiva ("23 oportunidades encontradas"), e solicita cadastro para visualizar os matches reais.

Apos o cadastro, um motor de matching correlaciona empresas por setor (CNAE), regiao e porte, gerando uma lista de oportunidades com botao "Falar com consultor" via WhatsApp.

---

### Fluxo do Usuario

```text
1. Usuario acessa /matching
2. Digita CNPJ ou nome da empresa
3. Edge function consulta BD externo -> retorna dados basicos
4. Formulario autocompleta (razao social, cidade, estado, CNAE)
5. Exibe: "23 oportunidades de negocios encontradas!"
6. Botao "Ver oportunidades" -> redireciona para /auth (se nao logado)
7. Apos login/cadastro -> /matching/resultados
8. Edge function executa matching real (CNAE + regiao + porte)
9. Lista de empresas compatíveis com botao "Falar com consultor" (WhatsApp)
```

---

### Arquivos a Criar

**1. Segredos necessarios**
- `EXTERNAL_SUPABASE_URL` - URL do Supabase externo
- `EXTERNAL_SUPABASE_KEY` - Chave de acesso do Supabase externo

**2. `supabase/functions/company-lookup/index.ts`** - Edge Function publica
- Recebe CNPJ ou termo de busca
- Conecta ao Supabase externo usando os segredos
- Retorna dados basicos da empresa (razao social, cidade, estado, CNAE, capital social)
- Gera numero "simulado" de oportunidades (baseado na quantidade real de empresas do mesmo CNAE/regiao no BD externo)
- Sem autenticacao necessaria (e o gancho para atrair o lead)

**3. `supabase/functions/matching-engine/index.ts`** - Edge Function protegida
- Requer autenticacao (usuario logado)
- Recebe CNPJ ou dados da empresa do usuario
- Consulta BD externo por empresas com CNAE similar, mesma regiao ou porte compativel
- Retorna lista de matches (limitada a 10-20 resultados)
- Oculta dados sensiveis (mostra apenas razao social, cidade/estado, porte)

**4. `src/pages/Matching.tsx`** - Pagina principal
- Hero section com proposta de valor: "Todas as empresas do Brasil em um so lugar"
- Campo de busca por CNPJ ou nome da empresa
- Ao digitar/buscar:
  - Mostra card com dados da empresa preenchidos automaticamente
  - Animacao de "escaneando base de dados..."
  - Exibe badge: "23 oportunidades encontradas"
  - CTA: "Cadastre-se para ver as oportunidades"
- Se usuario ja logado, vai direto para resultados

**5. `src/pages/MatchingResults.tsx`** - Pagina de resultados (protegida)
- Requer autenticacao
- Chama edge function matching-engine
- Lista de cards com empresas compativeis
- Cada card mostra: razao social, cidade/estado, setor, porte
- Botao "Falar com consultor" em cada card (abre WhatsApp com mensagem pre-formatada)
- Filtros basicos (regiao, setor)

**6. `src/components/matching/CompanySearchCard.tsx`** - Card de busca
- Input de CNPJ com mascara
- Ou campo de texto para razao social
- Exibe resultado da busca com dados autocompletados

**7. `src/components/matching/MatchCard.tsx`** - Card de resultado
- Exibe empresa compativel
- Indicador de compatibilidade (ex: "Alta compatibilidade")
- Botao WhatsApp

**8. `src/components/matching/MatchingHero.tsx`** - Hero da pagina

### Arquivos a Modificar

**9. `src/App.tsx`** - Adicionar rotas `/matching` e `/matching/resultados`

**10. `src/components/layout/Header.tsx`** - Adicionar link "Matching" na navegacao

**11. `supabase/config.toml`** - Configurar `verify_jwt = false` para `company-lookup`

---

### Detalhes Tecnicos

**Consulta ao BD externo (company-lookup):**
- Cria um cliente Supabase secundario na edge function usando as credenciais externas
- Busca por CNPJ (match exato) ou razao social (busca parcial com `ilike`)
- Conta empresas do mesmo CNAE para gerar o numero de oportunidades
- Responde sem autenticacao para maximizar conversao

**Motor de Matching (matching-engine):**
- Criterios de correlacao:
  1. Mesmo CNAE principal (peso alto)
  2. Mesma cidade ou estado (peso medio)  
  3. Faixa de capital social similar (peso baixo)
- Ordena por relevancia combinada
- Limita a 20 resultados
- Requer JWT valido

**Numero de oportunidades na pre-busca:**
- Conta registros reais no BD externo com mesmo CNAE + estado
- Aplica um multiplicador para parecer mais atrativo mas realista (ex: arredonda para dezena mais proxima)

**WhatsApp:**
- Usa o helper `getWhatsAppLink` ja existente
- Mensagem pre-formatada: "Ola, encontrei um match na PME.B3 entre [Empresa A] e [Empresa B]. Gostaria de mais informacoes."

