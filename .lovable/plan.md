## Blindagem das rotas de parceiro

Hoje `/parceiro` e `/potencial-carteira` estão registradas em `src/App.tsx` sem `RequireRole`. A sidebar já esconde os links para vendedor puro, mas qualquer logado consegue acessar digitando a URL direto. Vamos fechar esse gap.

### Mudanças

**`src/App.tsx`** (linhas 172-173): envolver as duas rotas com `RequireRole` aceitando os perfis que realmente operam parceria:

```tsx
<Route path="/parceiro" element={
  <RequireRole roles={["advisor","admin","franchisee","partner_accountant"]}>
    <PartnerDashboard />
  </RequireRole>
} />
<Route path="/potencial-carteira" element={
  <RequireRole roles={["advisor","admin","franchisee","partner_accountant"]}>
    <PortfolioPotential />
  </RequireRole>
} />
```

### Validação rápida pós-mudança

1. Conferir que `RequireRole` aceita o array acima (ver tipo do componente em `src/components/auth/RequireRole.tsx`); se ele só conhecer roles do enum `app_role` puro e tratar `partner_accountant` separado (via `is_partner_accountant` no profiles), ajusto pra usar a checagem correta — possivelmente `roles={["advisor","admin","franchisee"]}` + fallback no componente para `isPartnerAccountant`.
2. Testar acesso URL-direta como vendedor puro → deve redirecionar/bloquear.
3. Testar como advisor/admin/franqueado → deve continuar entrando normalmente.

### Fora do escopo

- `/painel` continua aberto a qualquer logado (cada user vê o próprio).
- Sidebar e edge function `assign-buyer-role` permanecem como estão.
