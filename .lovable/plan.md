## Validar conexão com banco externo de CNPJs

### Etapas

1. **Atualizar `cnpj-db-inspect`** com a nova string de conexão hardcoded temporariamente (apenas para esta validação).
2. **Deployar** o edge function.
3. **Rodar** o inspect e mostrar o resultado: lista de tabelas + colunas + contagem de cada tabela candidata (CNPJ, estabelecimentos, empresas, socios, etc.).
4. **Limpar imediatamente** — remover a string hardcoded do código e migrar para o secret `EXTERNAL_DB_URL` (vou tentar abrir o formulário de update_secret novamente; se ainda estiver indisponível, te oriento a colar manualmente no painel de Cloud → Secrets).
5. **Pedir 1 CNPJ real de teste** para você validar a query final antes de eu refatorar o `cnpj-lookup` em produção.

### Segurança

- A string fica no código por **menos de 1 minuto** (apenas durante o inspect)
- Imediatamente após o teste, removo e committo a versão limpa
- Você deve **deletar a mensagem com a string** depois (ícone de lixeira passando o mouse na mensagem)
- Se a string vazasse mesmo assim, basta resetar a senha do banco novamente