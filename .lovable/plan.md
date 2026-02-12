
## Troca de Nome da Plataforma: DealFlow → PME.B3

### Visão Geral
Alterar o nome da plataforma em todos os arquivos do projeto de "DealFlow" para "PME.B3". Isso inclui:
- Logo/nome em header e footer
- Títulos e descrições em componentes
- Metadados em HTML
- Comentários e textos em documentação
- PDFs e relatórios gerados

### Arquivos a Modificar (18 arquivos)

**1. Arquivos HTML/Meta**
- `index.html`: Alterar título, og:title, twitter:title de "VCE - Deal Flow" para "PME.B3"

**2. Componentes de Layout**
- `src/components/layout/Header.tsx`: Trocar logo "Deal<span>Flow</span>" por "PME<span>.B3</span>"
- `src/components/layout/Footer.tsx`: 
  - Logo no footer
  - Copyright "© 2024 DealFlow" → "© 2024 PME.B3"

**3. Componentes Valuation**
- `src/components/valuation/ValuationFooterCTA.tsx`: Copyright "© {ano} DealFlow" → "© {ano} PME.B3"
- `src/components/valuation/ValuationReportDialog.tsx`: 
  - Cabeçalho PDF "DEALFLOW" → "PME.B3"
  - Footer PDF "© DealFlow - Marketplace M&A" → "© PME.B3 - Marketplace M&A"
  - URL "www.dealflow.com.br" → "www.pmeb3.com.br"
- `src/components/valuation/DCFReportDialog.tsx`: Mesmo padrão do ValuationReportDialog

**4. Componentes de Marketing**
- `src/components/capital/TrustLogos.tsx`: "Quem confia na DealFlow" → "Quem confia na PME.B3"
- `src/components/capital/CapitalHowItWorks.tsx`: "Como funciona a captação com a DealFlow?" → "Como funciona a captação com a PME.B3?"
- `src/components/capital/MediaSection.tsx`: 
  - Título "DealFlow na Mídia" → "PME.B3 na Mídia"
  - Headlines que mencionam "DealFlow" → "PME.B3"
- `src/components/investors/InvestorBenefits.tsx`: "Por que investir com a DealFlow?" → "Por que investir com a PME.B3?"
- `src/components/investors/InvestorCTA.tsx`: "centenas de investidores que já descobriram negócios lucrativos através da DealFlow" → "...através da PME.B3"
- `src/components/investors/InvestorTestimonials.tsx`: "Investidores que já encontraram oportunidades através da DealFlow" → "...através da PME.B3"
- `src/components/sell/StepContact.tsx`: "Autorizo o DealFlow a divulgar meu anúncio" → "Autorizo a PME.B3 a divulgar meu anúncio"

**5. Dados e Utilitários**
- `src/data/mockData.ts`: Comentário "Mock data for DealFlow marketplace" → "Mock data for PME.B3 marketplace"
- `src/components/valuation/TrustSection.tsx`: Label "DealFlow" → "PME.B3"

**6. Estilos**
- `src/index.css`: Comentários "DealFlow - Premium M&A Marketplace" → "PME.B3 - Premium M&A Marketplace"

### Estratégia de Implementação

**Abordagem:**
- Usar `lov-line-replace` para cada arquivo, substituindo ocorrências de "DealFlow", "Deal Flow", "DEALFLOW" e "dealflow.com.br"
- Manter consistência: "PME.B3" é o nome formal (com ponto)
- Para logotipos visuais em header/footer que quebram em duas linhas: "PME<span class="text-accent">.B3</span>"
- URLs: mudar para "pmeb3.com.br"

**Ordem de implementação:**
1. Header e Footer (mais visíveis)
2. Componentes de marketing e investidores
3. Valuation e relatórios PDF
4. Dados e comentários

### Detalhes Técicos

- **Logo HTML**: Manter o padrão de duas cores usando `<span>` com a classe `text-accent`
- **Metadados**: Alterar título, og:title, twitter:title
- **PDFs**: Modificar nome em cabeçalhos e rodapés de relatórios
- **URLs**: Se houver referências a domínios, atualizar para pmeb3.com.br
- **Sem mudanças em lógica**: Todas as alterações são puramente textuais/visuais

### Impacto
- **Usuário final**: Nome e branding da plataforma atualizado em toda a interface
- **Dev**: Sem impacto em funcionalidade ou estrutura de código
