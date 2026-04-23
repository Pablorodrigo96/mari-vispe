

## Plano: Configurar Sergio como Head de Parcerias

Duas operacoes de dados (sem mudanca de schema):

### 1. Atribuir role `admin` ao Sergio
Inserir na tabela `user_roles` o registro `(user_id: 5c85799b-fa2e-4035-806a-da10c3696c23, role: admin)` para que ele passe pelo `AdminRoute` e acesse `/admin/parcerias`.

### 2. Atualizar perfil com nome
Atualizar `profiles` com `full_name = 'Sérgio William'` para que ele apareca corretamente nas listagens do painel.

### Observacao
Nenhuma migracao necessaria. Ambas sao operacoes de dados (INSERT/UPDATE) nas tabelas existentes `user_roles` e `profiles`.

