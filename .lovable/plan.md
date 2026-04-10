

## Plano: Corrigir Score, Progresso e Visibilidade Admin dos Documentos

### Problemas Identificados

1. **Score sempre baixo (13/100)**: O trigger SQL `calculate_lead_score` espera valores como `'above_1m'`, `'500k_1m'`, `'below_50k'` para `monthly_revenue` e `'above_10'`, `'5_10'` para `company_age`. Mas o frontend envia valores diferentes: `'ate-50k'`, `'50k-200k'`, `'acima-1m'`, `'10+'`, `'5-10'`, etc. Resultado: todos os CASE dão 0, sobrando apenas o score de completude (~13 pontos).

2. **Progresso não atualiza**: O `CapitalRequestDetail` busca `docsCount` uma única vez no mount. O `CapitalDocChecklist` não notifica o parent quando um documento é enviado.

3. **Admin não vê documentos**: O modal do admin (`AdminCapital.tsx`) mostra Timeline e Chat, mas não mostra o `CapitalDocChecklist` — o gestor não consegue ver os documentos enviados.

### Solução

#### 1. Alinhar valores do frontend com o trigger SQL
**Arquivo:** `src/components/capital/CapitalLeadModal.tsx` e `src/components/capital/CapitalSimulator.tsx`

Mapear os valores do simulador para os valores esperados pelo trigger antes do insert:

```text
Frontend → DB
'ate-50k'    → 'below_50k'
'50k-200k'   → '50k_100k' (ou criar '50k_200k' no trigger)
'200k-500k'  → '100k_500k'
'500k-1m'    → '500k_1m'
'acima-1m'   → 'above_1m'

'<1'   → 'below_1'
'1-3'  → '1_2'
'3-5'  → '2_5'
'5-10' → '5_10'
'10+'  → 'above_10'
```

Abordagem: atualizar o trigger SQL para aceitar AMBOS os formatos (antigos e novos), garantindo retrocompatibilidade.

#### 2. Recalcular lead_score quando documentos são enviados
**Migração SQL:** Criar trigger `on INSERT capital_documents` que incrementa o `lead_score` do request correspondente (bônus de +2 por documento, até +16 máximo).

#### 3. Progresso atualiza em tempo real
**Arquivo:** `src/components/capital/CapitalDocChecklist.tsx`
- Adicionar prop `onDocsChange?: (count: number) => void`
- Chamar após cada upload bem-sucedido

**Arquivo:** `src/pages/CapitalRequestDetail.tsx`
- Passar callback `onDocsChange` para atualizar `docsCount` no state

#### 4. Admin vê documentos no modal
**Arquivo:** `src/pages/admin/AdminCapital.tsx`
- Adicionar `CapitalDocChecklist` no modal de detalhe do lead, entre Timeline e Chat
- Adicionar seção "Documentos" com header

#### 5. Corrigir registro existente
**Migração SQL:** Atualizar o `lead_score` do registro existente recalculando com base nos dados atuais e documentos enviados.

### Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| Migração SQL | Atualizar trigger `calculate_lead_score` para aceitar ambos formatos de valores; criar trigger de bônus por documento; corrigir registro existente |
| `src/components/capital/CapitalDocChecklist.tsx` | Adicionar prop `onDocsChange` callback |
| `src/pages/CapitalRequestDetail.tsx` | Conectar `onDocsChange` ao state `docsCount` |
| `src/pages/admin/AdminCapital.tsx` | Adicionar `CapitalDocChecklist` no modal do lead |

