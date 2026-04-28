## Objetivo

Adicionar um pequeno painel de controle no Jarvis 3D para ajustar em tempo real a intensidade dos efeitos cinematográficos do fundo, melhorando a legibilidade conforme o monitor do usuário. Em seguida, validar visualmente o resultado.

## O que será feito

### 1. Estado dos efeitos (em `JarvisGraph3D.tsx`)

Adicionar 4 estados numéricos (0–100) com defaults compatíveis com os valores atuais:

- `glowIntensity` (default 70) — multiplica opacidade do halo aditivo dos nós e dos anéis orbitais.
- `scanlineIntensity` (default 50) — controla `opacity` da camada de scanlines horizontais (0 = oculta, 100 = 0.10).
- `vignetteIntensity` (default 60) — controla a curva alpha da vinheta radial (centro mais limpo / bordas mais escuras).
- `videoBrightness` (default 30) — controla `brightness()` do vídeo de fundo (0 = preto / 100 = 1.0).

Persistir em `localStorage` (`jarvis3d-visual-prefs`) para o usuário não precisar reajustar a cada visita.

### 2. Aplicar nos efeitos existentes

- **Vídeo de fundo**: `filter: brightness(videoBrightness/100 * 0.6 + 0.05) ...`
- **Vinheta**: gradiente radial dinâmico — alpha central = `0.35 * vignetteIntensity/60`, alpha das bordas escala proporcional.
- **Scanlines**: `opacity: scanlineIntensity / 1000` (mantém faixa sutil 0–0.10).
- **Glow dos nós** (`buildNodeObject`): `opacity: (0.08 + n.heat * 0.28) * (glowIntensity / 70)`.
- **Anéis orbitais e halo financial**: mesma escala `glowIntensity / 70`.

Como o `nodeThreeObject` depende desse valor, adicionar `glowIntensity` às deps de re-render (forçar refresh dos objetos 3D quando mudar — basta passar `nodeThreeObject` como nova função em cada render, o que já acontece).

### 3. Painel de ajuste — UI

Pequeno card flutuante no canto **inferior direito** (z-index 10), recolhível:

```text
┌─ ⚙ AJUSTES VISUAIS ─────┐
│ Glow         ▓▓▓▓░░ 70  │
│ Scanlines    ▓▓▓░░░ 50  │
│ Vinheta      ▓▓▓▓░ 60   │
│ Brilho vídeo ▓▓░░░░ 30  │
│              [Reset]    │
└─────────────────────────┘
```

- Estilo HUD consistente: `bg-zinc-950/85 backdrop-blur-md`, borda `border-emerald-900/40`, fonte mono, labels em `text-[10px] uppercase tracking-wider`.
- Sliders usando `@/components/ui/slider` (já existe), customizados com cor esmeralda.
- Botão de toggle (ícone engrenagem) para colapsar/expandir — colapsado mostra só o ícone para não atrapalhar.
- Botão "Reset" para voltar aos defaults.

### 4. Validação visual

Após implementar, abrir o preview em `/equity-brain/grafo-jarvis`, tirar screenshots em 2 cenários:

1. Defaults (sliders nas posições iniciais).
2. Cenário "alta legibilidade" (glow 40, scanlines 20, vinheta 80, brilho 15) para confirmar que reduzir os efeitos realmente limpa a tela.

Reportar achados e ajustar defaults se necessário.

## Arquivos afetados

- `src/components/equity-brain/jarvis/JarvisGraph3D.tsx` — adiciona estados, painel de ajuste, conecta valores aos efeitos visuais e ao `buildNodeObject`.

## Resultado esperado

Usuário consegue, sem mexer no código, calibrar o Jarvis 3D para seu monitor — reduzindo glow/scanlines/vinheta para máxima legibilidade ou aumentando para máximo impacto cinematográfico. Preferências persistem entre sessões.
