# Jarvis 3D — abrir leve por padrão

Hoje, ao entrar em `/equity-brain/grafo-jarvis`, o gráfico carrega com **todas as 7 camadas de aresta ativas**, **todos os 7 tipos de nó visíveis** e **todos os efeitos visuais no máximo** (glow 70, scanlines 50, vinheta 60, curvatura, 12 segmentos por link). Isso deixa o render pesado já no primeiro frame.

A mudança: quando a aba abre, **tudo começa desligado/mínimo**. O usuário liga progressivamente o que quer ver.

## O que vai mudar (em `JarvisGraph3D.tsx`)

### 1. Camadas de aresta (`enabledLayers`)
- **Antes:** 7 camadas ativas (`ma_direct`, `rollup`, `operational`, `commercial`, `arbitrage`, `capital`, `thesis`).
- **Depois:** começa com `Set` vazio. Usuário ativa pelo `GraphFilterSidebar`.

### 2. Tipos de nó (`selectedNodeTypes`)
- **Antes:** 7 tipos visíveis por padrão.
- **Depois:** começa vazio. Usuário ativa por tipo (sellers, buyers, teses…).

### 3. Preferências visuais (`VISUAL_DEFAULTS`)
Reduzir para o mínimo necessário para ainda enxergar o grafo:
- `glow: 70 → 0`
- `scanlines: 50 → 0`
- `vignette: 60 → 0`
- `brightness: 30 → 10`
- `linkSegments: 12 → 4` (linhas retas, muito mais leve)
- `curvatureMin / curvatureRange`: zerados

Mantém `localStorage` — se o usuário já personalizou, respeitamos a escolha dele; só novos visitantes pegam o default leve.

### 4. Botão "Ativar tudo" (novo, ao lado do Reset)
Para quem quer a experiência cheia rapidamente, um botão que:
- Marca todas as camadas e tipos de nó.
- Sobe glow/scanlines/vinheta/segmentos para os valores ricos antigos.

O `handleReset` continua restaurando o estado **leve** (não o cheio).

### 5. Aviso visual sutil
Quando `enabledLayers.size === 0` e `selectedNodeTypes.size === 0`, mostrar um overlay discreto no centro do canvas:
> "Selecione camadas e tipos de nó na barra lateral para começar — ou clique em **Ativar tudo**."

## Arquivos afetados
- `src/components/equity-brain/jarvis/JarvisGraph3D.tsx` — defaults, handleReset, novo botão "Ativar tudo", overlay vazio.

Sem mudanças de schema, RLS, edge functions ou rotas.
