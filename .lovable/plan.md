# Plano Perfeito como Hero Principal

## Objetivo
Promover "O Plano Perfeito" de banner discreto a **hero full-screen** que abre a página `/valuation`, acima inclusive do título "Quanto vale sua empresa?".

## Mudanças

### 1. `PlanoPerfeitoBanner.tsx` → `PlanoPerfeitoHero.tsx` (refatorar / renomear conceitualmente)
Transformar em **seção hero full-bleed**:
- `min-h-screen` (ou `min-h-[90vh]`) ocupando praticamente toda a primeira dobra
- Background próprio dramático: gradiente Carbon → Graphite + glow Volt + partículas (`ParticlesBackground`) + grid pattern
- Headline gigante (text-5xl md:text-7xl lg:text-8xl): **"Construa a ponte da sua empresa até o bilhão"**
- Eyebrow chip animado: "🚀 Novidade · O Plano Perfeito"
- Sub-headline explicativa (1 linha) sobre o que é o plano
- 3 mini-stats / pilares ("De onde você está → Onde quer chegar → Como chegar lá") em cards glass
- CTA principal gigante em Volt: **"Construir meu Plano Perfeito"** + CTA secundário ghost "Ver como funciona" (scroll para seção valuation tradicional)
- Animações framer-motion (fade/slide stagger), número/contador animado opcional (ex: "R$ 1B" pulsando)
- Indicador de scroll no rodapé apontando para o valuation tradicional abaixo

### 2. `Valuation.tsx`
Reordenar:
```
<Header />
<PlanoPerfeitoHero onStart={handleStartPlanoPerfeito} />   ← NOVO, acima de tudo
<ValuationTypeSelector ... />                              ← continua igual, sem o banner interno
... resto
```

### 3. `ValuationTypeSelector.tsx`
- **Remover** o `<PlanoPerfeitoBanner />` interno e a prop `onStartPlanoPerfeito` (ou deixar prop opcional não usada).
- Ajustar o headline da seção para algo como "Ou calcule o valor atual da sua empresa" (transição natural vinda do hero acima).

## Restrições
- Nome fixo: "O Plano Perfeito"
- Frase fixa: "Construa a ponte da sua empresa até o bilhão"
- 100% design system mari (Volt #D9F564, Carbon, glass-card, gradient-navy-deep)
- Sem alterar lógica de cálculo, wizard, rotas ou DB

## Arquivos tocados
- `src/components/valuation/plano-perfeito/PlanoPerfeitoBanner.tsx` (rewrite como hero full-screen)
- `src/pages/Valuation.tsx` (montar hero antes do TypeSelector)
- `src/components/valuation/ValuationTypeSelector.tsx` (remover banner interno)
