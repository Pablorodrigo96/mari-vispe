## O que será feito

Expandir a lista de setores nos seletores de Valuation (Wizard padrão e Certificador), com **Tecnologia & Telecom (ISP)** como primeiro item e cobertura ampla de setores PME brasileiras. Criar um **DE-PARA** central que mapeia cada setor novo para o múltiplo de mercado existente mais próximo — sem mexer no cálculo de valuation nem nos benchmarks.

---

### 1. Novo módulo `src/lib/sectorMapping.ts`

Centraliza:
- `SECTOR_OPTIONS: { label, benchmarkKey }[]` — lista exibida na UI (~35 setores).
- `resolveBenchmarkKey(label)` — converte o label exibido para a chave usada por `sectorMultiples` (`SaaS`, `Fintech`, `E-commerce`, `Saúde`, `Agronegócio`, `Educação`, `Logística`, `Indústria`, `Varejo`, `Serviços`, `Outros`).

**Ordem da lista (Tecnologia/Telecom ISP no topo):**

| Label exibido (UI) | Proxy de benchmark (cálculo) |
|---|---|
| Tecnologia & Telecom (ISP / Provedores de Internet) | SaaS |
| Tecnologia (Software / SaaS) | SaaS |
| Telecom (Operadoras / Infraestrutura) | SaaS |
| TI / Outsourcing / Data Center | Serviços |
| Fintech | Fintech |
| Serviços Financeiros / Crédito | Fintech |
| Seguros / Insurtech | Fintech |
| E-commerce / Marketplace | E-commerce |
| Marketing Digital / Mídia / Publicidade | Serviços |
| Saúde (Clínicas / Hospitais) | Saúde |
| Laboratórios / Diagnósticos | Saúde |
| Farmacêutica / Healthtech | Saúde |
| Beleza & Estética | Serviços |
| Educação / Edtech | Educação |
| Indústria / Manufatura | Indústria |
| Construção Civil / Engenharia | Indústria |
| Imobiliário / Real Estate | Indústria |
| Energia & Utilities | Indústria |
| Mineração / Metalurgia | Indústria |
| Automotivo / Autopeças | Indústria |
| Química / Petroquímica | Indústria |
| Varejo / Comércio | Varejo |
| Alimentos & Bebidas (Indústria) | Indústria |
| Restaurantes / Food Service | Serviços |
| Bens de Consumo | Varejo |
| Logística / Transporte | Logística |
| Agronegócio / Agro | Agronegócio |
| Pet & Veterinária | Varejo |
| Consultoria / Serviços Profissionais | Serviços |
| Jurídico / Contábil | Serviços |
| Recursos Humanos / Recrutamento | Serviços |
| Turismo / Hospitalidade / Hotelaria | Serviços |
| Mídia / Entretenimento / Eventos | Serviços |
| Limpeza / Facilities / Segurança | Serviços |
| Outros | Outros |

### 2. Plugar nos seletores

- **`src/components/valuation/StepCompanyProfile.tsx`** — substituir o array hardcoded `segments` por `SECTOR_OPTIONS`. O `<SelectItem value>` passa a ser `option.label` (preserva o que é gravado no banco).
- **`src/components/valuation/CertifierWizard.tsx`** — trocar `Object.keys(sectorMultiples)` por `SECTOR_OPTIONS`, mesmo padrão.

### 3. Garantir que o cálculo continue funcionando

- **`src/lib/valuationCalculator.ts`** — em `normalizeSegment`, antes do fallback final, chamar `resolveBenchmarkKey(segment)` quando a chave não existe direto em `sectorMultiples`. Assim "Telecom (Operadoras / Infraestrutura)" usa os múltiplos de SaaS, "Construção Civil" usa Indústria, etc. Cálculo permanece o mesmo — só a resolução do segmento ganha o passo extra.

### 4. Nada muda

- Múltiplos de mercado em `sectorMultiples` — intactos.
- DCFWizard usa `'Outros'` como default e não tem seletor de setor — fica igual.
- Listings/categorias em outros lugares (cadastro de anúncio, marketplace, perfil) — fora de escopo.

---

## Arquivos afetados

**Criados:**
- `src/lib/sectorMapping.ts`

**Editados:**
- `src/components/valuation/StepCompanyProfile.tsx`
- `src/components/valuation/CertifierWizard.tsx`
- `src/lib/valuationCalculator.ts` (apenas `normalizeSegment` ganha um passo de proxy)

## Notas técnicas

- O label gravado em `valuation_history.segment` será o novo (mais descritivo) — histórico antigo continua válido porque `normalizeSegment` ainda faz o match case-insensitive contra as chaves originais.
- Sem migration de banco. Sem mudança em RLS.
