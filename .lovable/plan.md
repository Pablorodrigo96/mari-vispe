## Escopo

Três entregas independentes sobre o pipeline jurídico (NDA/NBO/SPA/TS):

### 1. Geração em segundo plano (background)

Hoje o usuário precisa deixar o modal `LegalDocumentGenerator` aberto enquanto o Claude gera (SPA leva ~60-90s). Vamos liberar a navegação:

- Criar `GenerationTracker` (contexto + provider em `App.tsx`) que mantém um array de gerações ativas: `{ id, dealId, label, startedAt, status: 'running' | 'done' | 'error', resultId? }`.
- `useGenerateLegalDocument` passa a registrar a geração no tracker; ao concluir, atualiza status e invalida a query.
- Componente flutuante `GenerationToaster` (canto inferior direito, abaixo do FAB Mari) lista as gerações ativas: cada item mostra label + spinner + tempo decorrido. Quando finaliza, vira card verde "✓ SPA pronto — abrir" que leva até o documento e some sozinho em 10s.
- O botão "Gerar documento" no modal mostra toast "Gerando em segundo plano — você pode fechar essa janela" e fecha o modal automaticamente. O usuário pode reabrir e ver na aba Biblioteca quando ficar pronto.
- Sem novas tabelas: o estado vive em memória (perde no refresh, o que é aceitável — o documento já fica persistido pelo edge function).

### 2. Preview "Word-like" do contrato

Substituir o atual `<pre font-mono>` em fundo escuro nos **3 lugares**:
- `LegalDocumentGenerator.tsx` (DocumentReviewer, linha 471-473)
- `pages/legal/AssinaturaPublica.tsx` (linha 132-134)
- `pages/legal/HomologacaoPublica.tsx` (linha ~80)

Criar componente `WordPreview` em `src/components/legal/WordPreview.tsx`:
- Página A4 simulada: fundo branco (`bg-white`), sombra elegante, largura ~816px (8.5"), padding 96px (1"), margem auto.
- Tipografia jurídica: Georgia/serif, 11pt body, 14pt h2, 18pt h1, line-height 1.5, cor `#1a1a1a`, parágrafos justificados.
- Renderiza markdown via `react-markdown` (já instalado) — headings, bold/itálico, listas, tabelas (`remark-gfm` se necessário, ou parsing manual de `## ##`).
- Wrapper externo escuro mantém o look do app; "papel" branco no centro destaca o conteúdo.
- Numeração de cláusulas preservada (a IA já gera `### CLÁUSULA PRIMEIRA`).

### 3. Página extra de Comprovante na assinatura

Após `signed = true` em `AssinaturaPublica.tsx`, renderizar um novo bloco **abaixo do contrato**, no formato do print PlugSign (substituindo branding):

Criar `src/components/legal/SignatureCertificate.tsx`:
- Página A4 estilo papel timbrado (mesma base do `WordPreview`).
- Borda decorativa: padrão SVG/CSS de losangos azul-Vispe em todo o perímetro (`linear-gradient` repetido ou SVG inline).
- Header: "COMPROVANTE DE ASSINATURA ELETRÔNICA" à esquerda + logo "Vispe Sign" à direita.
- Título do documento + ID único (hash truncado).
- Bloco "Assinatura e histórico":
  - Esquerda: nome do signatário em fonte handwriting (`font-family: "Caveat", "Brush Script MT"`, ~32px).
  - Direita: Nome completo, CPF (placeholder se ausente), Data de nascimento (placeholder), E-mail/telefone, Endereço de IP, Data/hora da assinatura.
- Texto legal: "O documento não foi modificado, a assinatura eletrônica é válida... conforme MP 2.200-2/2001 art. 10 §2º e Lei 14.063/2020."
- Rodapé: 2 QR codes (Histórico do DOC / Validação) gerados via `qrcode` (instalar) ou serviço SVG público; selos textuais "ITI · ICP-Brasil · NTP.br"; carimbo "Datas baseadas em fuso GMT-3 (Brasília), sincronizado com NTP.br e Observatório Nacional".
- URL de validação: `https://mari.vispe.com.br/assinar/{token}` (reusa a página atual em modo somente leitura).

Mostrar botão "Baixar comprovante (PDF)" usando `window.print()` com CSS `@media print` que oculta tudo exceto o certificado (sem dependência nova de PDF).

## Arquivos novos

- `src/components/legal/WordPreview.tsx`
- `src/components/legal/SignatureCertificate.tsx`
- `src/components/legal/GenerationTracker.tsx` (context + provider + toaster UI)
- `src/hooks/useGenerationTracker.ts`

## Arquivos editados

- `src/App.tsx` — montar `<GenerationTrackerProvider>` + `<GenerationToaster />`
- `src/hooks/useLegalDocs.ts` — `useGenerateLegalDocument` notifica o tracker
- `src/components/legal/LegalDocumentGenerator.tsx` — fecha o modal ao disparar; usa `WordPreview` no review
- `src/pages/legal/AssinaturaPublica.tsx` — `WordPreview` + `SignatureCertificate` após assinar
- `src/pages/legal/HomologacaoPublica.tsx` — `WordPreview` no lugar do `<pre>`

## Dependências

- `qrcode` (`bun add qrcode @types/qrcode`) — geração de QR para o certificado.
- `react-markdown` já presente.

## Critérios de aceite

- Disparo de geração de SPA permite fechar o modal e navegar; tracker mostra spinner + tempo; ao concluir, toast clicável abre o documento.
- O conteúdo do contrato aparece como folha branca tipo Word (serif, justificado, A4 simulado) em todos os lugares.
- Após assinar, aparece a página estilo PlugSign com nome handwriting, dados do signatário, QR codes, selos e validade jurídica. Botão imprime/exporta só o certificado.