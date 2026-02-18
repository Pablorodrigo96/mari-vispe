

## Tornar o Matching mais explicativo e guiado

### Mudancas no Hero (`src/components/matching/MatchingHero.tsx`)

- Trocar titulo para algo como: "Sua empresa ja esta em nosso radar"
- Subtitulo explicativo: "Com o buscador inteligente da PME.B3, encontramos oportunidades de negocios compativeis com a sua empresa. Digite o nome da sua empresa abaixo, selecione a correta e veja as oportunidades esperando por voce."
- Adicionar indicador visual de passos (1, 2, 3) para guiar o usuario:
  1. "Digite o nome da sua empresa"
  2. "Selecione a empresa correta"
  3. "Veja as oportunidades para voce"

### Mudancas no Card de Busca (`src/components/matching/CompanySearchCard.tsx`)

- Adicionar titulo/label acima do campo de busca: "Busque sua empresa pelo nome"
- Placeholder mais claro: "Digite o nome da sua empresa..."
- Apos exibir o resultado, adicionar texto contextual antes do badge de oportunidades, como: "Encontramos oportunidades compativeis com o seu negocio!"

### Detalhes tecnicos

- Atualizar textos em `MatchingHero.tsx`: titulo, subtitulo e adicionar secao de 3 passos com icones numerados
- Atualizar `CompanySearchCard.tsx`: adicionar label explicativo acima do input e texto de contexto apos o resultado
- Nenhuma mudanca em edge functions ou logica de dados

