

## Correcao: Navegacao Presa na Pagina de Valuation

### Problema

A pagina `/valuation` usa estado interno do React (`useState`) para alternar entre 3 telas:
- Landing (selecao de tipo)
- Wizard de Multiplos
- Wizard DCF

Como a URL nao muda (sempre `/valuation`), o usuario fica "preso" porque:
1. Clicar em "Valuation" no menu nao faz nada - o React Router ve que ja esta em `/valuation`
2. O botao Voltar do navegador nao funciona - nao houve troca de rota
3. Clicar em outras abas pode conflitar com o estado interno

### Solucao

Converter os wizards em rotas proprias usando React Router, eliminando o controle por estado interno:

- `/valuation` - Pagina landing (selecao de plano)
- `/valuation/multiplos` - Wizard de Multiplos
- `/valuation/dcf` - Wizard DCF

### Detalhes Tecnicos

**1. Arquivo: `src/App.tsx`**

Adicionar duas novas rotas:

```tsx
import ValuationMultiplos from "./pages/ValuationMultiplos";
import ValuationDCF from "./pages/ValuationDCF";

// Dentro de Routes:
<Route path="/valuation" element={<Valuation />} />
<Route path="/valuation/multiplos" element={<ValuationMultiplos />} />
<Route path="/valuation/dcf" element={<ValuationDCF />} />
```

**2. Novo arquivo: `src/pages/ValuationMultiplos.tsx`**

Pagina wrapper que renderiza o `ValuationWizard` com `onBack` fazendo `navigate('/valuation')`.

**3. Novo arquivo: `src/pages/ValuationDCF.tsx`**

Pagina wrapper que renderiza o `DCFWizard` com `onBack` fazendo `navigate('/valuation')`.

**4. Arquivo: `src/pages/Valuation.tsx`**

Simplificar removendo o estado `view` e as renderizacoes condicionais dos wizards. Os botoes `onSelectFree` e `onSelectDCF` passam a fazer `navigate('/valuation/multiplos')` e `navigate('/valuation/dcf')` respectivamente. A verificacao de login e acesso continua antes de navegar.

**5. Arquivos: `ValuationWizard.tsx` e `DCFWizard.tsx`**

Atualizar o botao "Voltar" do primeiro passo para usar `navigate('/valuation')` ao inves de chamar `onBack()` (ou manter `onBack` que agora fara o navigate na pagina wrapper).

### Beneficios

- Navegacao do Header funciona normalmente em todas as telas
- Botao Voltar do navegador funciona corretamente
- Cada tela tem sua propria URL (compartilhavel, bookmark)
- Sem estado interno que pode travar
