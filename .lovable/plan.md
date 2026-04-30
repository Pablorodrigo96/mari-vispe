# Acelerar resposta da Mari Brain

## Diagnóstico

A função `mari-brain` está lenta porque:

1. Usa **`google/gemini-2.5-pro`**, o modelo mais lento da família (alta latência de "time to first token", ~3-8s antes de começar o streaming).
2. Injeta a **KB inteira (8 arquivos markdown)** no system prompt a cada mensagem — milhares de tokens que aumentam TTFT e custo.
3. Histórico de 20 msgs + KB + contexto vivo somam um prompt muito pesado para perguntas simples.

## Mudanças

### 1. Trocar modelo padrão para `gemini-2.5-flash`
- ~3-5x mais rápido que Pro, mantendo qualidade alta para Q&A operacional de M&A.
- Pro fica disponível como fallback opcional via parâmetro `model` no body (ex.: para análises complexas).

### 2. Reduzir histórico carregado de 20 → 10 mensagens
- Mantém continuidade da conversa sem inflar o prompt.

### 3. Limitar KB carregada a ~40k chars
- Trunca cada arquivo se ultrapassar, preservando topo (definições, rotas, regras principais).
- Ainda dá à Mari conhecimento autoritativo, mas com 30-50% menos tokens no system.

### 4. Reduzir top matches de 5 → 3 e mandates do snapshot
- Contexto vivo continua útil mas mais enxuto.

### 5. Garantir flush imediato do stream
- Verificar que o `controller.enqueue(value)` acontece sem buffering adicional (já está correto, só validar headers).

## Arquivo afetado

- `supabase/functions/mari-brain/index.ts`

## Resultado esperado

- TTFT (primeira palavra aparecendo): de ~5-10s → ~1-2s
- Resposta completa curta: de ~15-25s → ~4-8s
- Custo por request reduzido ~60%
