
## Melhoria do Design do Menu de Filtros Lateral

### Análise Atual

O componente `MapFilterSidebar` tem um design funcional, mas pode ser melhorado em:
- **Visual:** Fundo simples sem destaque visual (apenas `bg-card`)
- **Espaçamento:** Acordeons com spacing minimal (`space-y-1`)
- **Headers:** Seções sem diferenciação visual clara
- **Interatividade:** Sem feedback visual ou hover states melhorados
- **Mobile:** Design não otimizado especificamente para telas pequenas
- **Contraste:** Labels e filtros podem ter melhor hierarquia visual

Comparando com `FilterSidebar` do marketplace (que tem mais polimento):
- Usa `rounded-xl border` para mais destaque
- Spacing maior (`space-y-2`, `mb-4`, `mt-6`)
- Botão de ação visual ("Aplicar Filtros" no mobile)
- Padding interno melhor distribuído

### Melhorias Propostas

**1. Visual e Layout**
- Adicionar `rounded-lg` (ou `rounded-xl` no desktop) para maior destaque
- Melhorar padding/spacing interno (p-4 → p-5 ou p-6)
- Adicionar fundo gradiente sutil ou efeito de superfície elevada
- Melhorar espaçamento entre acordeons (`space-y-2` em vez de `space-y-1`)
- Adicionar borda sutil que combine com o tema

**2. Header**
- Aumentar tamanho do ícone (`h-4 w-4` → `h-5 w-5`)
- Melhorar alinhamento e spacing do header (`mb-4` explícito)
- Melhorar visual do badge (maior ou com background melhor)

**3. Seções de Filtro (Acordeons)**
- Aumentar padding dos triggers (`py-2.5` → `py-3`)
- Melhorar spacing do conteúdo (`pt-1 pb-3` → `pt-2 pb-4`)
- Adicionar ícones visuais para cada categoria de filtro (opcional)
- Melhorar contraste de texto selecionado

**4. Checkboxes e Labels**
- Aumentar spacing entre items (`space-y-2` está ok, manter)
- Melhorar label styling (mais legibilidade)
- Adicionar hover states mais sutis

**5. Price Range Slider**
- Melhorar spacing em volta do slider
- Aumentar tamanho do texto de valores (`text-xs` → `text-sm`)
- Melhorar apresentação (valores em cards pequenos, opcional)

**6. Botão Limpar**
- Melhorar visual do botão "Limpar"
- Considerar usar variant "outline" em vez de "ghost" para maior destaque

**7. Responsividade**
- Garantir que funciona bem no mobile sheet (`w-80`)
- Melhorar padding em telas pequenas
- Considerar adicionar botão "Aplicar Filtros" visual (como no FilterSidebar) no mobile

### Implementação

As alterações serão apenas em `src/components/map/MapFilterSidebar.tsx`:

**Alterações de styling:**
- Header: melhorar spacing e visual
- Container: adicionar `rounded-lg`, melhorar padding
- Acordeons: aumentar `space-y-2`, ajustar py/pt/pb
- Buttons: melhorar variantes e styling
- Overall: seguir pattern do `FilterSidebar` (que é mais polido)

**Sem mudanças estruturais:** Lógica de filtros permanece igual, apenas CSS/Tailwind.

