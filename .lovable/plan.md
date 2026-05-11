## Adicionar mini-box "Advisor pessoal" no rodapé da sidebar

Adicionar um pequeno card acima do footer de usuário em `src/components/layout/AppSidebar.tsx`, visível para todos os usuários logados.

### Conteúdo
- Label superior: "Seu advisor pessoal"
- Nome: **Rafael Cocolichio**
- CTA: "Falar com ele" → abre WhatsApp via helper `getWhatsAppLink(5551992338258)` (telefone padrão já registrado em memória do projeto) em nova aba

### Estilo (tokens Mari)
- Card com `bg-muted/40 border border-border rounded-lg p-3`
- Acento Volt no ícone MessageCircle e no link "Falar com ele"
- Avatar pequeno com iniciais "RC" (`bg-volt/20 text-volt`)
- `break-words` no nome conforme padrão do projeto

### Comportamento por estado
- **Expandido**: card completo (avatar + label + nome + CTA)
- **Colapsado**: apenas botão ícone MessageCircle (Volt) com tooltip "Rafael Cocolichio — Falar"

### Posição
Inserido logo antes do bloco `{/* User footer */}` (linha 290), separado por `border-t`.

### Arquivos afetados
- `src/components/layout/AppSidebar.tsx` (única mudança)

Sem migrações, sem mudanças em outros componentes.