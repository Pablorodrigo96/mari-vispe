

## Plano: Adicionar Acesso ao Cadastro de Comprador

### Problema
A rota `/cadastrar-comprador` existe mas não há link em nenhum menu. O usuário não consegue descobrir como cadastrar um comprador.

### Mudanças

#### 1. Header: Adicionar "Cadastrar Comprador" ao dropdown do usuário logado
No menu dropdown do avatar (desktop e mobile), adicionar item "Cadastrar Comprador" com ícone `UserSearch`, abaixo de "Meus Anúncios".

#### 2. MyListings: Botão "Cadastrar Comprador" no topo da página
Ao lado do botão "Novo Anúncio", adicionar um botão secundário "Cadastrar Comprador" que navega para `/cadastrar-comprador`.

### Seção Técnica

| Arquivo | Ação |
|---|---|
| `Header.tsx` | Adicionar `DropdownMenuItem` "Cadastrar Comprador" no dropdown do avatar (desktop) + botão no menu mobile |
| `MyListings.tsx` | Adicionar botão "Cadastrar Comprador" ao lado do "Novo Anúncio" no header da página |

