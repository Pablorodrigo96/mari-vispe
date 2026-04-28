Plano para restaurar as empresas no marketplace e no mapa

Diagnóstico confirmado:
- Os registros não foram apagados: existem 86 empresas ativas e 1 comprador ativo na base principal.
- O problema está na visibilidade pública: `marketplace` e `mapa` consultam as views `public_listings` e `public_buyer_profiles`.
- Essas views estão com `security_invoker=on`, então passaram a respeitar as regras internas das tabelas `listings` e `buyer_profiles`.
- Hoje a tabela `listings` só permite SELECT para o dono ou admin. Resultado: visitantes e usuários comuns não conseguem ver anúncios ativos de outros usuários, então o marketplace e o mapa aparecem zerados.
- A mesma lógica afeta compradores ativos no mapa, porque `buyer_profiles` só permite SELECT para dono ou admin.

O que vou fazer após sua aprovação:

1. Restaurar leitura pública segura para anúncios ativos
- Criar/ajustar uma política de leitura em `public.listings` permitindo que qualquer visitante veja somente anúncios com `status = 'active'`.
- Manter dados sensíveis protegidos usando a view `public_listings`, que não expõe campos como `cnpj`, `cep`, `street`, `show_address` e outros dados privados.
- Manter a tabela principal como base única. Nada será recortado, deletado ou duplicado indevidamente.

2. Restaurar leitura pública segura para compradores ativos no mapa
- Criar/ajustar uma política de leitura em `public.buyer_profiles` permitindo leitura somente de perfis com `status = 'active'`.
- Continuar usando a view `public_buyer_profiles`, que não expõe `email` nem `whatsapp`.
- Manter contato privado visível apenas para dono/admin via tabela base, quando aplicável.

3. Garantir base única + replicação apenas para o motor
- Preservar `public.listings` como a “fonte da verdade” do marketplace/mapa.
- Preservar `public.buyer_profiles` como a “fonte da verdade” dos compradores cadastrados.
- O motor (`equity_brain`) deve receber cópia/sincronização por trigger, nunca mover ou deletar registros da base pública.
- Verificar se o trigger `sync_listing_to_equity_brain` continua ativo para que novos cadastros apareçam no motor sem sumir do front.

4. Ajustar código apenas se necessário
- Se o banco corrigir a visibilidade, manter as telas como estão, pois elas já consultam as views corretas.
- Se necessário, adicionar tratamento de erro/log no marketplace e mapa para mostrar falha real de permissão em vez de simplesmente “0 empresas”.

5. Validação
- Conferir via banco que `public_listings` volta a retornar as 86 empresas ativas.
- Conferir via banco que `public_buyer_profiles` volta a retornar comprador(es) ativos sem email/WhatsApp.
- Conferir que marketplace e mapa voltam a consumir a base principal e exibir empresas clusterizadas.

Resultado esperado:
- Marketplace volta a exibir as empresas cadastradas.
- Mapa volta a clusterizar as empresas.
- O motor continua recebendo os dados, mas sem “roubar” os registros do front.
- Todos os cadastros continuam em uma base única principal, com sincronização/cópia para o motor quando necessário.