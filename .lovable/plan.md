## Adicionar logo Vispe ao lado do logo mari no header

### O que será feito
Posicionar o logo da Vispe à esquerda do logo "mari" no header público (visitor), com transição igual à do logo mari (versão escura sobre hero transparente, versão branca sobre header sólido).

### Passos

1. **Copiar os assets** enviados para `src/assets/`:
   - `user-uploads://logo_vispe_preto.png` → `src/assets/vispe-logo-dark.png` (usado quando o header está sólido/claro — logo preto sobre fundo branco)
   - `user-uploads://LOGO_VISPE_BRANCO-2.png` → `src/assets/vispe-logo-light.png` (usado sobre o hero escuro transparente — logo branco)

2. **Editar `src/components/layout/Header.tsx`** (bloco do `<Link to="/">`, linhas ~85–104):
   - Importar os dois assets como ES6 modules.
   - Envolver o conteúdo do link num `flex items-center gap-3`.
   - Adicionar antes do `MariLogo` um wrapper com dois `<img>` da Vispe (altura ~28px), usando o mesmo padrão de duas camadas com `opacity` controlada por `isTransparent`:
     - `vispe-logo-light` visível quando `isTransparent` (header transparente sobre hero escuro)
     - `vispe-logo-dark` visível quando header sólido
   - Adicionar um divisor vertical sutil (`h-8 w-px bg-current opacity-20`) entre os dois logos para indicar coexistência das marcas.
   - Manter `alt="Vispe Capital"` para acessibilidade.

3. **Sem mudanças** em `AppTopbar` (logado) — usuário pediu apenas no header público onde aparece o logo mari mostrado no print.

### Detalhes técnicos
- O Header já retorna `null` para usuários logados (AppShell), então a alteração afeta somente as páginas públicas (Home, Marketplace, etc.).
- Reutilizar exatamente o mesmo mecanismo de toggle (`opacity-0`/`opacity-100` + `absolute inset-0`) já usado pelo MariLogo para garantir transição suave idêntica.
- Altura do logo Vispe: ~28–32px para ficar visualmente equilibrado com o `MariLogo size={96}` (que renderiza altura efetiva menor).