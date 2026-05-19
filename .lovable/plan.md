## O que vamos resolver

**Bug do erro `value too long for type character varying(14)`**
A coluna `equity_brain.mandates.company_cnpj` (e `companies.cnpj`) é `varchar(14)` — espera só os 14 dígitos. O formulário envia o CNPJ mascarado (`50.604.596/0001-07` = 18 chars) direto pra RPC `eb_upsert_mandate`, daí o estouro.

**Auto-preenchimento ao digitar o CNPJ**
Já existe `useNationalSearch().lookupCnpj()` que consulta a base RFB + BrasilAPI e devolve razão social, fantasia, UF, CNAE, setor, telefone, e-mail etc. Hoje só é usado no Sell Wizard. Vamos plugá-lo no `MandateFormPage`.

## Mudanças (somente frontend — `src/pages/equity-brain/MandateFormPage.tsx`)

1. **Normalizar CNPJ antes de salvar**
   - No `submit()`, mandar `company_cnpj: form.company_cnpj.replace(/\D/g, '')` no payload da RPC.
   - Validar que tem 14 dígitos antes de chamar (`toast.error("CNPJ inválido")`).

2. **Máscara no input de CNPJ**
   - Reutilizar `maskCnpj` de `src/lib/mariWindowHeuristic.ts` (já usado em `CnpjInput`).
   - Aplicar `onChange` para formatar visualmente.

3. **Lookup automático ao completar 14 dígitos**
   - Importar `useNationalSearch` e chamar `lookupCnpj(clean)` num `useEffect` que dispara quando `cleanDigits.length === 14`.
   - Indicador de loading discreto ("Consultando Receita…").
   - Toast de sucesso ("Dados preenchidos automaticamente") ou aviso ("CNPJ não encontrado na base — preencha manualmente").

4. **Mapear resposta → form (só preenche campos vazios, não sobrescreve o que advisor já digitou)**
   ```text
   razao_social      ← company.razao_social
   nome_fantasia     ← company.nome_fantasia
   uf                ← company.uf || company.state
   setor             ← company.cnae_principal_descricao || company.category
   regiao            ← derivado da UF (SP/RJ/MG/ES → sudeste, etc.)
   contato_telefone  ← company.phone || company.telefone (se vazio)
   contato_email     ← company.email (se vazio)
   ```

5. **Helper `ufToRegiao`** (inline no arquivo, ~10 linhas) com os 5 mapeamentos já usados nos selects.

## O que **não** vamos mexer

- RPC `eb_upsert_mandate`, schema do banco, ou `varchar(14)` — o fix é no frontend (normalizar antes de enviar), evitando migração.
- `useNationalSearch`, `national-search` edge function, BrasilAPI fallback — tudo já pronto.
- Nenhuma outra rota / componente.

## Como vou testar

1. Abrir `/equity-brain/crm/mandate/new`, digitar `50604596000107` → ver razão social "Gummy Sevpon…", UF, setor preenchidos automaticamente.
2. Clicar "Salvar mandato" → sem erro de varchar, redireciona pra `/equity-brain/crm/mandate/:id`.
3. Digitar CNPJ inexistente → toast "não encontrado", formulário continua editável.
