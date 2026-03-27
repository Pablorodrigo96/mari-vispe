

## Plano: Clusters Separados + Popup Sigiloso para Compradores

### Problemas
1. **Cluster único**: Vendedores e compradores são agrupados no mesmo cluster, impossibilitando distinguir quantos são de cada tipo numa região
2. **Nome visível**: O popup do comprador exibe `buyer_name` e `company_name`, que são sigilosos
3. **Sem CTA para vendedores**: Falta um botão "Cadastrar para essa oportunidade" onde um vendedor pode demonstrar interesse em vender para aquele comprador

---

### 1. Clusters Separados por Tipo

Criar **dois `markerClusterGroup`** independentes em vez de um só:
- **Cluster dourado** (vendedores): estilo com fundo `hsl(45, 93%, 47%)` e texto escuro
- **Cluster azul** (compradores): estilo com fundo `hsl(210, 80%, 50%)` e texto branco

Cada cluster terá seu próprio `iconCreateFunction` com cores distintas. Ambos são adicionados ao mapa separadamente.

### 2. Popup do Comprador Sigiloso

Substituir o nome real por dados anônimos:
- Em vez de `buyer_name`, exibir **"Comprador Ativo"** ou um código como "CPR-001"
- Remover `company_name` do popup
- Manter visíveis: setores de interesse, faixa de cheque, cidade/estado (genérico)
- Remover o link direto de WhatsApp do popup

### 3. Botão "Cadastrar para essa Oportunidade"

No popup do comprador, adicionar um botão que redireciona para uma rota ou abre um formulário simplificado onde o vendedor pode registrar interesse em vender para aquele comprador. Implementação:
- Botão no popup: **"Tenho uma empresa para este comprador"**
- Ao clicar, redireciona para `/cadastrar-comprador` com query param `?buyer_id=<id>` (ou abre WhatsApp da PME.B3 com mensagem pré-formatada mencionando o código do comprador)
- Abordagem mais simples e eficaz: link WhatsApp para a equipe PME.B3 com texto "Tenho interesse em vender para o comprador CPR-XXX na região Y"

### Seção Técnica

| Arquivo | Ação |
|---|---|
| `BusinessMap.tsx` | Criar dois `markerClusterGroup` separados (dourado e azul), anonimizar popup do comprador, adicionar botão CTA WhatsApp PME.B3 |

**Cluster sellers:**
```text
iconCreateFunction → fundo hsl(45,93%,47%), texto hsl(0,0%,10%)
html: `<div style="...">${count} 🏢</div>`
```

**Cluster buyers:**
```text
iconCreateFunction → fundo hsl(210,80%,50%), texto white
html: `<div style="...">${count} 👤</div>`
```

**Popup comprador (anonimizado):**
```text
"Comprador Ativo" (sem nome real)
Setores: Alimentação, Varejo
Cheque: R$ 500K a R$ 2M
📍 São Paulo, SP
[Tenho uma empresa para este comprador] → WhatsApp PME.B3
```

