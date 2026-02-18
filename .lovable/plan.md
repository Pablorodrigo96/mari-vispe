

## Atualizar formato do link WhatsApp para wa.me

Mudanca simples no arquivo `src/lib/whatsapp.ts`: trocar o formato do link de `https://api.whatsapp.com/send/?phone=...` para `https://wa.me/5551992338258`.

### O que muda

| Arquivo | Mudanca |
|---------|---------|
| `src/lib/whatsapp.ts` | Alterar `getWhatsAppLink` para usar `https://wa.me/5551992338258?text=...` |

O formato `wa.me` e mais curto, universal e funciona tanto em desktop quanto em mobile. Todos os componentes que usam `openWhatsApp` ou `getWhatsAppLink` (incluindo o `ConsultorBanner`) serao atualizados automaticamente pois importam do mesmo helper centralizado.

### Detalhe tecnico

A linha 5 do `src/lib/whatsapp.ts` muda de:
```
https://api.whatsapp.com/send/?phone=5551992338258&text=...
```
Para:
```
https://wa.me/5551992338258?text=...
```
