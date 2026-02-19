
## Particulas e Efeitos de Conexao na Tela Inicial (Index)

A homepage ja tem o fundo `gradient-navy-deep` + `bg-grid-pattern` + radial glows, mas falta o componente `ParticlesBackground` que ja foi criado e esta sendo usado em outras paginas. Alem disso, vou adicionar animacoes `framer-motion` para dar mais vida ao hero.

### Mudancas no arquivo `src/pages/Index.tsx`

1. **Importar `ParticlesBackground`** e **`motion` do framer-motion**
2. **Adicionar `<ParticlesBackground />` dentro da hero section** (logo apos os radial glows, antes do container de conteudo) - as particulas com linhas de conexao SVG darao o efeito de "rede neural" e tecnologia
3. **Adicionar `<ParticlesBackground />` na CTA section** (secao final com fundo dark) para manter consistencia
4. **Envolver elementos do hero com `motion.div`** para animacoes de entrada staggered:
   - Badge: fade-in com delay 0
   - Titulo h1: fade-in com delay 0.1s
   - Paragrafo: fade-in com delay 0.2s
   - Botoes CTA: fade-in com delay 0.3s
   - SearchBar: fade-in-up com delay 0.4s
   - Stats: fade-in com stagger por index

### Resultado visual

- Dots flutuantes com animacao `float` no fundo do hero (brancos, baixa opacidade)
- Linhas SVG conectando alguns dots, simulando uma rede de conexoes/tecnologia
- Mesmas particulas na secao CTA final
- Animacoes suaves de entrada ao carregar a pagina

### Detalhes tecnicos

- Componente `ParticlesBackground` ja existe em `src/components/ui/particles-background.tsx`
- Usa CSS puro (`animate-float`) + SVG para linhas
- `framer-motion` ja instalado
- Nenhuma dependencia nova
