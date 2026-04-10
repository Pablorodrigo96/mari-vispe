

## Plano: 7 Melhorias na Página de Detalhe da Captação

### 1. Score 20% Mais Otimista
**Arquivo:** `src/lib/capitalScoring.ts`
- Adicionar bônus de +10 pontos base (de 50 para 60) e ajustar thresholds para serem mais generosos
- Ratio > 2 passa a dar +15 (era +10), ratio > 1 dá +10 (era +5)

### 2. Seção de Documentos Mais Convidativa
**Arquivo:** `src/components/capital/CapitalDocChecklist.tsx`
- Adicionar header motivacional: "Quanto mais documentos, maior sua chance de aprovação!"
- Mostrar barra de progresso visual dos docs enviados
- Adicionar seção de documentos opcionais extras: IRPJ, Certidão Negativa, Extratos Bancários, Relatório de Vendas
- Mensagem de incentivo quando < 100% docs enviados

### 3. Corrigir Upload de Documentos
**Arquivo:** `src/components/capital/CapitalDocChecklist.tsx`
- Sanitizar nome do arquivo removendo espaços e caracteres especiais (ç, º, ã, etc.) antes do upload
- Expandir `input.accept` para: `.pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,.doc,.docx,.zip,.rar,.txt,.xml`
- O bucket é privado, trocar `getPublicUrl` por `createSignedUrl` ou montar a URL via path relativo

### 4. Status "Enviado" ao invés de "Pendente"
**Arquivo:** `src/components/capital/CapitalDocChecklist.tsx`
- Trocar `status: 'pending'` no insert para `status: 'uploaded'` (que mapeia para "Enviado")

### 5. Melhorar Relatório PDF
**Arquivo:** `src/pages/CapitalRequestDetail.tsx`
- Substituir `window.print()` por um componente de relatório estilizado com `@media print`
- Incluir seções: dados da empresa, valor solicitado, score, tipo de captação, objetivo, status atual, documentos enviados, próximos passos
- Adicionar logo e cabeçalho "Relatório de Captação — Vispe" no print
- Esconder header/footer/sidebar no print com CSS `@media print { .no-print { display: none } }`

### 6. Chat → Redirecionamento WhatsApp
**Arquivo:** `src/components/capital/CapitalChat.tsx`
- Remover o chat em tempo real (Supabase realtime)
- Substituir por um CTA bonito: "Fale com nosso Analista via WhatsApp"
- Usar `openWhatsApp()` com mensagem contextualizada:
  ```
  Olá! Sou da empresa {company_name}, tenho uma proposta de captação de {formatFullCurrency(amount)} ({capital_type} - {objective}). ID: {requestId}. Gostaria de falar com um analista.
  ```
- Props: receber `companyName`, `amount`, `capitalType`, `objective` além de `requestId`

### 7. Próximos Passos — Mencionar Fundos/Investidores
**Arquivo:** `src/pages/CapitalRequestDetail.tsx`
- Atualizar `nextSteps` para incluir em todos os status relevantes:
  - "Sua proposta será enviada para fundos, investidores, bancos e cooperativas com fit para sua estrutura de captação"
  - pending: adicionar "Enviaremos seu perfil a fundos e investidores parceiros após análise"
  - in_review: adicionar "Estamos identificando fundos, bancos e cooperativas com fit para seu perfil"
  - matched: alterar para "Fundos, investidores e cooperativas com fit já foram identificados"

### Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `src/lib/capitalScoring.ts` | Score base +20% mais otimista |
| `src/components/capital/CapitalDocChecklist.tsx` | UI convidativa, fix upload (sanitização + accept + status), docs opcionais |
| `src/components/capital/CapitalChat.tsx` | Substituir chat por CTA WhatsApp contextualizado |
| `src/pages/CapitalRequestDetail.tsx` | Relatório PDF estilizado, próximos passos com fundos/investidores, passar props ao Chat |

