

## Motor de Matching Automatico - Estrutura Completa

Vou criar toda a estrutura do Matching (paginas, componentes, edge functions) usando placeholders para os segredos. Quando voce fornecer a URL e chave do Supabase externo, basta adicionarmos os segredos e tudo funciona.

---

### O que sera criado

**Edge Functions (backend)**

1. `supabase/functions/company-lookup/index.ts` - Busca publica por CNPJ/razao social no BD externo. Retorna dados da empresa e contagem de oportunidades. Sem autenticacao (para captar leads).

2. `supabase/functions/matching-engine/index.ts` - Motor de matching protegido (requer login). Correlaciona empresas por CNAE, regiao e porte. Retorna ate 20 matches.

**Paginas**

3. `src/pages/Matching.tsx` - Pagina principal com hero persuasivo, campo de busca CNPJ/nome, card com dados autocompletados, animacao de escaneamento, badge de oportunidades e CTA para cadastro.

4. `src/pages/MatchingResults.tsx` - Pagina protegida com lista de matches, filtros por regiao/setor, botao "Falar com consultor" (WhatsApp).

**Componentes**

5. `src/components/matching/MatchingHero.tsx` - Hero com titulo "Todas as empresas do Brasil em um so lugar"

6. `src/components/matching/CompanySearchCard.tsx` - Campo de busca com mascara de CNPJ, exibicao dos dados autocompletados e badge de oportunidades

7. `src/components/matching/MatchCard.tsx` - Card de empresa compativel com indicador de compatibilidade e botao WhatsApp

**Modificacoes**

8. `src/App.tsx` - Adicionar rotas `/matching` e `/matching/resultados`

9. `src/components/layout/Header.tsx` - Adicionar "Matching" na navegacao

10. `supabase/config.toml` - Adicionar `verify_jwt = false` para ambas edge functions

---

### Segredos pendentes

As edge functions vao ler `EXTERNAL_SUPABASE_URL` e `EXTERNAL_SUPABASE_KEY` dos segredos. Se nao estiverem configurados, retornam erro amigavel pedindo configuracao. Assim voce pode testar a interface antes de fornecer as credenciais.

---

### Detalhes Tecnicos

- Edge functions usam `createClient` do supabase-js com as credenciais externas
- `company-lookup`: busca por CNPJ (match exato) ou razao social (`ilike`), conta empresas do mesmo CNAE/estado para gerar numero de oportunidades
- `matching-engine`: valida JWT via `getClaims()`, filtra por CNAE similar + mesma regiao + faixa de capital social, ordena por relevancia
- WhatsApp usa helper `getWhatsAppLink` existente com mensagem pre-formatada
- A tabela externa sera referenciada como `empresas` (ajustaremos o nome real depois)

