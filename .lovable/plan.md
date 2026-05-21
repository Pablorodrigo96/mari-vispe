## Bloco 2 (parcial — sem depender do e-mail)

Email da gráfica fica em standby até o domínio Cloudflare normalizar. Vou adiantar tudo que não depende de envio.

### 1. Wire do botão "Gerar carta em lote" no `ProspectionTab.tsx`

- Importar `SendLettersDialog`.
- Adicionar estado `lettersOpen`.
- Trocar o `handleGenerateLetters` atual (que só dá toast e muda status) por: validar `≤200` e `missingAddress=0`, depois abrir o dialog.
- Renderizar `<SendLettersDialog open contacts={selectedRows} onComplete={() => setSelected(new Set())} />` no final.
- O dialog já está pronto, já chama a edge `send-letters-batch`, gera PDF+CSV no bucket e marca `letter_batches.status='sent'` mesmo sem e-mail (advisor baixa em `/equity-brain/cartas/historico`).

### 2. Tela admin de configuração da Gráfica

Criar `src/pages/admin/AdminLettersSettings.tsx` com 4 campos persistidos em `api_settings` (RLS já restringe a admin):

- `grafica_email` (obrigatório)
- `grafica_cc` (opcional, lista por vírgula)
- `letter_sender_name` (default: "mari · Vispe Group")
- `letter_sender_address` (multiline, usado no cabeçalho do PDF)

Carrega via `select * from api_settings where key in (...)`, salva via `upsert onConflict=key`. Visual mari (Carbon/Volt, glassmorphism). Aviso no rodapé: enquanto o e-mail não estiver conectado, advisor baixa PDF/CSV em Cartas → Histórico; envio automático passa a funcionar assim que o domínio for habilitado.

Registrar rota em `src/App.tsx` dentro do bloco `AppShell`:

```
<Route path="/admin/cartas-grafica" element={<RequireRole roles={["admin"]}><AdminLettersSettings /></RequireRole>} />
```

### 3. Sidebar — entradas novas

Em `src/components/layout/AppSidebar.tsx`:

- Novo grupo para advisor/admin (acima do grupo Admin):
  ```
  {
    id: 'cartas', name: '✉️ Cartas', icon: Mail,
    children: [
      { name: 'Histórico de lotes', href: '/equity-brain/cartas/historico', icon: ClipboardList },
      ...(eff.isAdmin ? [
        { name: 'Modelos', href: '/equity-brain/cartas/modelos', icon: FileText },
        { name: 'Config. gráfica', href: '/admin/cartas-grafica', icon: Mail },
      ] : []),
    ],
  }
  ```
- Mostrar para `eff.isAdmin || eff.isAdvisor`.
- Importar `Mail` de `lucide-react` (ainda não está nos imports atuais).

### Fora de escopo (segue pausado)

- Provisionar Lovable Emails / template `prospect-letters-batch` / refactor da edge para `send-transactional-email`. Tudo isso espera o domínio `notify.vispe.com.br` ser conectado ao projeto.

### Estimativa

~30 min. Sem migração, sem novos secrets, sem edge function nova.
