## Problema

Ao rolar a página, o header transita de transparente (fundo escuro) para branco. O texto e ícones mudam suavemente em ~300ms, mas o **logo "mari" demora muito para mudar** porque o componente `MariLogo` troca o `src` da `<img>` entre `mari-lockup-dark.png` e `mari-lockup-light.png`. O navegador precisa baixar/decodificar a outra imagem na hora, gerando o atraso visível.

## Solução

Renderizar **as duas variantes do lockup empilhadas** no header e alternar apenas a `opacity` via CSS. Assim:
- Os dois PNGs ficam pré-carregados e cacheados desde o primeiro render.
- A troca acontece instantaneamente, acompanhando os 300ms da transição do restante do header (texto, fundo, borda).
- Sem flash, sem atraso de download.

## Mudanças

**`src/components/layout/Header.tsx`** (apenas o bloco do logo, linhas ~85–91)

Substituir o `<MariLogo variant={…} />` único por um wrapper relativo que contém duas `<MariLogo>` sobrepostas:

```tsx
<Link to="/" className="flex items-center">
  <div className="relative" style={{ height: 72 }}>
    <MariLogo
      variant="dark"
      size={72}
      className={cn(
        "transition-opacity duration-300 mt-[10px] mb-[10px] px-[50px]",
        isTransparent ? "opacity-100" : "opacity-0"
      )}
    />
    <MariLogo
      variant="light"
      size={72}
      className={cn(
        "absolute inset-0 transition-opacity duration-300 mt-[10px] mb-[10px] px-[50px]",
        isTransparent ? "opacity-0" : "opacity-100"
      )}
    />
  </div>
</Link>
```

A primeira imagem mantém o fluxo (define a largura do container); a segunda é absoluta e fica por cima. O `transition-opacity duration-300` casa exatamente com a transição do `<header>`.

## Notas técnicas

- Não é necessário mexer em `MariLogo.tsx`, nos assets PNG, nem no `Footer`/`AppSidebar` (eles não trocam de variante em scroll).
- O custo é apenas 1 imagem extra carregada uma vez (já está no bundle do Vite, mesma origem).
- Mantém todas as classes de espaçamento atuais (`mt-[10px]`, `mb-[10px]`, `px-[50px]`).