# Páginas institucionais do portal /investir

Vou criar todas as páginas listadas como rotas reais dentro do namespace `/investir/*`, reaproveitando o shell público (`InvestirShell`), `SectionBand`, `PartnersStrip` e tokens da mari (Carbon/Volt/Bone/Graphite). Nome da empresa = **mari** (já é o branding do projeto).

## Rotas a criar

Institucional
- `/investir/sobre` — Sobre a mari (hub que linka as 3 abaixo)
- `/investir/sobre/a-mari` — A mari (história, missão, números)
- `/investir/sobre/quem-somos` — Time, fundadores, conselho
- `/investir/sobre/vantagens` — Vantagens mari (vs corretora tradicional)

Políticas
- `/investir/politicas` — Hub
- `/investir/politicas/privacidade` — Política de Privacidade (LGPD)
- `/investir/politicas/cookies` — Política de Cookies

Carreiras
- `/investir/carreiras` — Trabalhe conosco + vagas mock

Produtos
- `/investir/produtos` — Hub
- `/investir/produtos/investimentos` — Todos os investimentos (Equity, Dívida, Tokens) → linka `/investir/listagem`
- `/investir/produtos/simulador` — Simulador de investimento (reusa `SimuladorRapido`)

Ferramentas
- `/investir/ferramentas` — Todas as plataformas
- `/investir/ferramentas/app` — Aplicativo mari (mockups mobile)
- `/investir/ferramentas/home-broker` — Home Broker mari

Serviços
- `/investir/servicos/cartao` — Cartão de crédito mari (em breve)

Conteúdo
- `/investir/blog` — Blog (lista de 6 posts mock com imagens)

Custos
- `/investir/custos` — Custos operacionais (tabela transparente: 0 corretagem, taxa de performance, etc.)

Ajuda
- `/investir/ajuda` — Central de atendimento (FAQ + busca + canais)
- `/investir/ajuda/dicionario` — Dicionário de finanças (A–Z, ~30 termos)

Atendimento
- `/investir/atendimento` — Hub
- `/investir/atendimento/cvm` — Atendimento CVM (link cvm.gov.br + explicação)
- `/investir/atendimento/rmp` — Atendimento RMP (Resolução de Mediação e Prevenção)
- `/investir/atendimento/ouvidoria` — Ouvidoria (formulário + prazos)

## Componentes novos (mínimos)

- `src/components/investir/InstitutionalHero.tsx` — hero reaproveitável (título, kicker, imagem opcional 16:9, breadcrumb)
- `src/components/investir/InvestirFooter.tsx` — footer mega-menu agrupando todas as rotas acima (substitui/expande o footer atual no `InvestirShell`)
- `src/components/investir/HubGrid.tsx` — grid de cards para páginas-hub (Sobre, Políticas, Produtos, Ferramentas, Atendimento)

## Implementação

- Cada página: shell + `InstitutionalHero` + 2–4 `SectionBand` com conteúdo, FAQ quando fizer sentido, CTA final (`Abrir conta` ou voltar para `/investir`).
- Mobile-first: tipografia escala `text-2xl md:text-4xl`, paddings `py-10 md:py-20`, grids `grid-cols-1 md:grid-cols-2/3`.
- Imagens via Unsplash (já é padrão do `investirPhotos.ts`) para humanizar — pessoas, escritório, mãos no celular.
- Lazy loading de todas as rotas em `src/App.tsx` (mesmo padrão da `InvestirRegulamentacao`).
- Atualizar footer do `InvestirShell` para linkar as novas rotas em colunas: **Sobre · Produtos · Ferramentas · Ajuda · Políticas**.
- Todo conteúdo é placeholder coerente em pt-BR — datas, números e bios fictícios mas plausíveis, sem inventar certificações específicas (seguir trust-page-generation: nada de "certificado SOC2" etc.). Política de Privacidade/Cookies em linguagem LGPD genérica com aviso de que o texto deve ser revisado pelo jurídico.

## Fora de escopo

- Backend, tabelas, edge functions (tudo estático).
- Sistema de blog real (CMS) — apenas página com posts mock.
- Formulários funcionais (ouvidoria, candidatura) — UI apenas, sem submit.
- Tradução / i18n.

## Entrega

~20 arquivos de página + 3 componentes + edição de `App.tsx` e `InvestirShell.tsx` (footer). Sem mudanças em rotas existentes nem em backend.
