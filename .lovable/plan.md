
## Adicionar pablo@vispe.com.br como Admin

### Dados Encontrados
- **Nome**: Pablo Constantino
- **User ID**: `6f4dc217-487c-499a-8662-78b92f1b00cb`
- **Status**: Conta já criada e ativa

### Solução Proposta
Criar um edge function administrativo que permite adicionar roles de forma segura, garantindo que apenas administradores autenticados possam executar essa ação.

### Implementação

**1. Criar Edge Function: `supabase/functions/add-admin-role/index.ts`**
- Função protegida que verifica autenticação
- Valida que o usuário autenticado é admin
- Insere a role 'admin' para o usuário especificado
- Retorna confirmação ou erro

**2. Executar a Função**
- Chamar a edge function com o `user_id` do pablo
- Sistema inserirá automaticamente a role na tabela `user_roles`
- pablo@vispe.com.br terá acesso imediato ao painel admin (/admin)

### Detalhes Técnicos
- Função usará `auth.uid()` para validar que quem faz a requisição é admin
- Usará `has_role(auth.uid(), 'admin')` para checagem de segurança
- Fará INSERT na tabela `public.user_roles`
- Endpoint será protegido com RLS policies

### Resultado Esperado
- pablo@vispe.com.br poderá acessar `/admin`
- Aparecerá com role 'admin' na tabela de usuários do painel admin
- Terá privilégios administrativos completos no sistema (gestão de usuários, valuations, assinaturas, etc.)
