

## Plano: Remover Campos da Planilha de Upload em Lote

### Mudança
Remover 4 campos do template e do processamento no `BulkUploadDialog.tsx`:
- `metros_quadrados` (square_meters)
- `valor_iptu` (iptu_value)
- `video_url`
- `valor_aluguel` (rent_value)

### Arquivo: `src/components/sell/BulkUploadDialog.tsx`

1. **TEMPLATE_HEADERS**: Remover `'metros_quadrados'`, `'valor_aluguel'`, `'valor_iptu'`, `'video_url'` do array
2. **TEMPLATE_EXAMPLE**: Remover os 4 valores correspondentes do array de exemplo
3. **handleUpload inserts**: Remover as 4 propriedades (`square_meters`, `rent_value`, `iptu_value`, `video_url`) do objeto de inserção

