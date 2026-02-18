

## Matching com Empresas Cadastradas (tabela listings)

Em vez de depender do banco externo, vou adaptar o matching para usar a tabela `listings` que ja existe no projeto. Assim voce pode testar tudo imediatamente com os anuncios ja cadastrados.

### O que muda

**Edge Functions - Remover dependencia do BD externo**

1. `supabase/functions/company-lookup/index.ts` - Passa a consultar a tabela `listings` (status = 'active') em vez do BD externo. Busca por titulo, categoria ou cidade. Retorna dados do anuncio e conta quantos listings semelhantes existem (mesma categoria/estado).

2. `supabase/functions/matching-engine/index.ts` - Consulta `listings` ativas com mesma categoria, estado proximo ou faixa de faturamento similar. Nao precisa mais de `EXTERNAL_SUPABASE_URL`/`EXTERNAL_SUPABASE_KEY`.

**Componentes - Adaptar campos**

3. `src/components/matching/CompanySearchCard.tsx` - Remover mascara de CNPJ (listings nao tem CNPJ obrigatoriamente). Campo de busca generico por nome/titulo do negocio. Exibir dados do listing encontrado (titulo, categoria, cidade/estado, faturamento).

4. `src/components/matching/MatchCard.tsx` - Adaptar campos para dados de listings (titulo, categoria, cidade/estado, faixa de preco). Botao "Ver anuncio" alem do WhatsApp.

5. `src/pages/MatchingResults.tsx` - Adaptar para receber dados de listing em vez de empresa externa.

### Criterios de Matching (usando listings)

- Mesma categoria (peso alto: +50)
- Mesmo estado (peso medio: +25)
- Mesma cidade (bonus: +15)
- Faixa de faturamento similar (peso baixo: +10)

### Vantagem

Funciona imediatamente sem nenhum segredo externo. Depois, basta trocar a fonte de dados nas edge functions para o BD externo.
