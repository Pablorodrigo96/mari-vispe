
## Editar Anuncio apos Cadastro (Incluindo Imagens)

### Problema
A plataforma nao possui uma pagina de edicao de anuncios. O botao "Editar" em "Meus Anuncios" navega para `/editar-anuncio/:id`, mas essa rota nao existe. Isso impede o usuario de adicionar imagens ou alterar qualquer dado apos o cadastro.

### Solucao
Criar uma pagina completa de edicao que reutiliza os mesmos componentes do wizard de cadastro, permitindo alterar todos os campos, incluindo upload de novas imagens.

---

### Arquivos a criar

#### 1. `src/pages/EditListing.tsx`
Pagina de edicao do anuncio com:
- Carrega os dados existentes do listing pelo ID da URL
- Verifica que o usuario logado e o dono do anuncio
- Exibe os 4 mesmos steps do wizard original (Empresa, Descricao, Fotos, Ponto Comercial), mas em formato de abas ou secoes editaveis (nao wizard sequencial)
- Reutiliza o componente `ImageUpload` existente para adicionar/remover fotos
- Botao "Salvar Alteracoes" que faz `UPDATE` na tabela `listings`
- Apos salvar, redireciona para `/meus-anuncios` com toast de sucesso

### Arquivos a modificar

#### 2. `src/App.tsx`
- Adicionar rota `/editar-anuncio/:id` apontando para `EditListing`

---

### Secao Tecnica

A pagina de edicao usara:
- `useParams()` para obter o ID do listing
- Query ao Supabase para carregar os dados existentes
- Verificacao `listing.user_id === user.id` para seguranca
- Componente `ImageUpload` (ja existente) para gerenciar fotos no storage `listing-images`
- `supabase.from('listings').update(...)` para persistir alteracoes
- Layout em secoes colapsaveis (Accordion) ao inves de wizard sequencial, para facilitar edicao pontual

| Arquivo | Acao |
|---|---|
| `src/pages/EditListing.tsx` | Criar |
| `src/App.tsx` | Adicionar rota `/editar-anuncio/:id` |
