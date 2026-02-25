

## Plano: Adicionar campo "Informações Gerais" ao formulário de cadastro e Blind Teaser

### Objetivo
Adicionar um campo de texto livre no formulário de cadastro de empresas para informações adicionais relevantes ao teaser (diferenciais, prêmios, certificações, estrutura, etc.), e exibi-lo no Blind Teaser.

### Mudanças

#### 1. Migração de banco de dados
- Adicionar coluna `additional_info` (tipo `text`, nullable) à tabela `listings`
- Atualizar a view `public_listings` para incluir o novo campo

#### 2. `src/components/sell/wizard/StepDescriptionLocation.tsx`
- Adicionar um segundo `<Textarea>` após a descrição, com label "Informações Adicionais para o Teaser"
- Placeholder orientando o usuário: "Diferenciais, prêmios, certificações, estrutura da equipe, potencial de crescimento..."
- Campo opcional, sem validação de mínimo de caracteres
- Contador de caracteres como o da descrição

#### 3. `src/components/sell/wizard/listingSchema.ts`
- Adicionar `additionalInfo: z.string().optional()` nos schemas (step2 e geral)
- Adicionar ao `initialFormData`

#### 4. `src/components/sell/wizard/NewListingWizard.tsx`
- Adicionar `additionalInfo` ao `FormData` interface e ao estado
- Passar para `StepDescriptionLocation`
- Incluir no insert do Supabase como `additional_info`

#### 5. `src/pages/EditListing.tsx`
- Adicionar `additionalInfo` ao formData
- Carregar e salvar o campo `additional_info`

#### 6. `src/pages/BlindTeaser.tsx`
- Incluir `additional_info` na interface `TeaserListing`
- Passar para `TeaserIntro` como nova prop

#### 7. `src/components/teaser/TeaserIntro.tsx`
- Receber prop `additionalInfo`
- Exibir abaixo da descrição em um bloco visual diferenciado (com ícone e borda dourada), apenas se preenchido

### Seção Técnica

| Arquivo | Ação |
|---|---|
| Migração SQL | `ALTER TABLE listings ADD COLUMN additional_info text` + atualizar view |
| `StepDescriptionLocation.tsx` | Novo Textarea para informações adicionais |
| `listingSchema.ts` | Adicionar `additionalInfo` opcional |
| `NewListingWizard.tsx` | Incluir no estado e insert |
| `EditListing.tsx` | Carregar e salvar campo |
| `BlindTeaser.tsx` | Passar para TeaserIntro |
| `TeaserIntro.tsx` | Exibir bloco de informações adicionais |

