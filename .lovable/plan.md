

## Plano: Adicionar Logo Vispe ao Footer

### O que será feito
Adicionar uma seção entre os links e o copyright do footer com o logo da Vispe e a frase "PME.B3 é a camada de tecnologia e marketplace do Grupo Vispe."

### Alterações

1. **Copiar o logo** `user-uploads://LOGO_VISPE_BRANCO.png` para `src/assets/vispe-logo-branco.png`

2. **`src/components/layout/Footer.tsx`**
   - Importar o logo como asset ES6
   - Adicionar seção entre o grid de links e o bloco de copyright, com:
     - Logo Vispe (altura ~28px)
     - Texto: "PME.B3 é a camada de tecnologia e marketplace do Grupo Vispe."
   - Centralizado, com opacidade reduzida para manter hierarquia visual

