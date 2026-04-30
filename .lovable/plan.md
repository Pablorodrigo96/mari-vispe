Cinco correções pontuais. Todas independentes — podem ir num único deploy.

## 1. Buyers não aparecem após cadastro

**Causa real:** Os 200 buyers da ANATEL e os recém-criados manualmente nascem com `vertical_principal = NULL`. O `useVertical` tem default `isp` (mapeado para `'telecom'`), e a query filtra `.eq("vertical_principal","telecom")`, escondendo todos os 484 buyers sem vertical preenchido. No banco temos 503 buyers, só 19 com `telecom`.

**Fix:**
- Em `src/pages/equity-brain/BuyersPage.tsx`, mudar o filtro para incluir `vertical_principal IS NULL` quando uma vertical específica está selecionada: `q = q.or('vertical_principal.eq.${buyerVerticalKey},vertical_principal.is.null')`.
- Ao criar buyer manualmente, preencher `vertical_principal` com `buyerVerticalKey` (quando não for `null`), para os novos já caírem na vertical correta.
- Migração leve: `UPDATE equity_brain.buyers SET vertical_principal='telecom' WHERE vertical_principal IS NULL AND source IN ('import_anatel','anatel_promote')` — para a base ANATEL aparecer no filtro ISP.

## 2. Adicionar contato falha com "invalid input syntax for type uuid"

**Causa:** `equity_brain.contacts.entity_id` é coluna `uuid`. O `AddContactDialog` é chamado com `entityType="company" entityId={cnpj}` (DealCard linhas 257, 276, 300; MatchDetailDrawer; MatchDetailPage), passando o CNPJ (14 dígitos) — ou pior, o codename — para uma coluna UUID.

**Fix em `AddContactDialog.tsx`:** quando `entityType === "company"`, resolver o `company.id` (uuid) a partir do CNPJ antes do insert:
```
const { data: comp } = await supabase.schema("equity_brain")
  .from("companies").select("id").eq("cnpj", cnpj14).maybeSingle();
if (!comp) throw new Error("Empresa não encontrada na base");
payload.entity_id = comp.id;
```
Manter o `entityId` da prop como input (CNPJ ou codename) e fazer `cnpj14 = entityId.replace(/\D/g,'')`. Se não for CNPJ válido, tentar resolver via `codename`.

## 3. Jarvis 3D abre cortado na primeira vez

**Causa:** `JarvisGraph3D` mede `containerRef.current.clientWidth/Height` no mount, mas o sidebar/topbar do AppShell ainda estão se acomodando, então pega largura menor. Não há observer.

**Fix:** adicionar `ResizeObserver` no `containerRef` que dispara `setSize(...)` e `fgRef.current?.refresh()` em qualquer mudança. Também forçar um re-measure após `requestAnimationFrame` 2x no mount (`rAF → rAF → measure`) para pegar o layout estabilizado.

## 4. Não consigo registrar call

**Causa:** Edge function `feedback-from-call` valida `raw_notes.length >= 20` e rejeita com 400. O usuário digitou `"aassdasa"` (8 chars). O frontend só mostra "Edge Function returned a non-2xx status code", sem o detalhe.

**Fix duplo:**
- **UI (`QuickCallModal.tsx`):** se `notes.length > 0 && notes.length < 20`, desabilitar botão e mostrar hint "Mínimo 20 caracteres ou deixe vazio". Se vazio, enviar `raw_notes: undefined` (já faz). Atualizar o label "≥ 50 chars dispara IA" para "≥ 20 chars (≥ 50 dispara IA)".
- **Mostrar erro real:** ao receber `error` do `supabase.functions.invoke`, tentar ler `error.context?.body` ou `error.message` e exibir no toast em vez de só "non-2xx".

## 5. Stripe Upgrade off

**Causa:** Botão "Fazer Upgrade" em `MyProfile.tsx:533` está com `onClick={() => toast.info('Integração de pagamento em breve!')}`. Já existe edge function `create-checkout` deployada e a integração Stripe está enabled.

**Fix:** trocar o handler por `handleUpgrade` que chama:
```
const { data, error } = await supabase.functions.invoke('create-checkout');
if (data?.url) window.open(data.url, '_blank');
```
Conferir se `create-checkout` já tem o `price_id` do plano Master configurado; se não, perguntar ao usuário qual price_id usar (ou criar produto Master R$99/mês na Stripe).

## Bonus — busca "Vispe Capital" na Matching

A imagem 114 mostra "Edge Function returned a non-2xx status code" para Vispe Capital. O `company-lookup` retorna 404 quando não encontra listing — frontend deveria capturar e mostrar "Nenhum negócio encontrado", mas o `supabase-js` trata 404 como `fnError` e `data` fica null, gerando o toast genérico. Fix: no edge function, trocar 404 por 200 com `{ error: "..." }` (que o frontend já trata em `if (data.error)`).

## Ordem de execução
1. SQL migration (UPDATE vertical_principal ANATEL).
2. Edits de UI (BuyersPage, AddContactDialog, JarvisGraph3D, QuickCallModal, MyProfile, CompanySearchCard).
3. Editar `company-lookup/index.ts` (404 → 200 + error).
4. Deploy automático das edge functions.

Sem novas tabelas, sem novos secrets. Tempo: ~10 min de implementação.
