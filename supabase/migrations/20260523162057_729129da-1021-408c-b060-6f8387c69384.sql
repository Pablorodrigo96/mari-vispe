
-- 1. Tabela de archive
CREATE TABLE IF NOT EXISTS public.doc_templates_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  template_body text,
  customizable_fields jsonb,
  static_clauses jsonb,
  ai_instructions text,
  preferred_model text,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_reason text
);

ALTER TABLE public.doc_templates_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read template archive" ON public.doc_templates_archive;
CREATE POLICY "Admins can read template archive"
ON public.doc_templates_archive FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert template archive" ON public.doc_templates_archive;
CREATE POLICY "Admins can insert template archive"
ON public.doc_templates_archive FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_doc_templates_archive_code ON public.doc_templates_archive(code, archived_at DESC);

-- 2. Backup do NBO v1
INSERT INTO public.doc_templates_archive (
  code, template_body, customizable_fields, static_clauses, ai_instructions, preferred_model, archived_reason
)
SELECT code, template_body, customizable_fields, static_clauses, ai_instructions, preferred_model, 'NBO v1 → v2 correction (Pablo)'
FROM public.doc_templates
WHERE code = 'legal_nbo_v1';

-- 3. Update do template
UPDATE public.doc_templates
SET
  template_body = $TPL$# PROPOSTA NÃO VINCULANTE (NBO — Non-Binding Offer)


A presente Proposta não Vinculante ("NBO"), delineia alguns dos principais termos que deverão reger um potencial acordo para aquisição de participação societária, fundos de comércio, ativos, entre outros, não obrigando ou limitando-se a estes atos, devendo ser definido conforme for convencionado entre as partes, tendo a presente Proposta como escopo concluir a Transação de maneira tranquila e em uma curta janela de tempo.

Esta Proposta não Vinculante ("NBO") é firmada a partir da data da última assinatura abaixo, (a "Data Efetiva") entre **{{vendedor_razao_social}}**, {{vendedor_tipo_societario}}, inscrita no CNPJ/MF sob o n° **{{vendedor_cnpj}}**, com sede na {{vendedor_endereco_completo}}, representada, neste ato, por {{vendedor_representante_qualificacao}} ("**{{vendedor_apelido}}** ou **VENDEDORA**"); **{{comprador_razao_social}}**, {{comprador_tipo_societario}}, inscrita no CNPJ/MF sob o n° **{{comprador_cnpj}}**, com sede na {{comprador_endereco_completo}}, representada, neste ato, por {{comprador_representante_qualificacao}} ("**{{comprador_apelido}}** ou **COMPRADORA**"); e **VISPE CAPITAL CONSULTORIA EMPRESARIAL LTDA**, CNPJ/MF de n° 31.526.112/0001-04, com sede na Rua Adolfo Inácio de Barcelos, n° 1.003, 4° andar, bairro Centro, em Gravataí, RS, CEP 94.035-360, representada, neste ato, na forma de seu Contrato Social ("**Vispe**").

Fazem parte desta Transação as empresas supramencionadas na qualidade de Parte Interessada na Venda, a {{vendedor_apelido}}, e na qualidade de Parte Interessada na Compra, a {{comprador_apelido}}, atuando como Parte Intermediadora a "Vispe". Assim, as partes acordam o seguinte:


## 1. Termos propostos para a Transação:

{{objeto_descricao_completa}}

Para fins de definição do valor da transação, as Partes firmam a presente Proposta Não Vinculante, caracterizada como Intenção, alinhando que, após auditoria, a estimativa de preço de aquisição da operação é de R$ {{valor_por_unidade}} ({{valor_por_unidade_extenso}}) por {{unidade_negociada}}, estimado, neste ato, em R$ {{valor_total_numerico}} ({{valor_total_extenso}}), considerando {{quantidade_unidades}} ({{quantidade_unidades_extenso}}) {{unidade_negociada_plural}} {{condicao_temporal_quantidade}}, o que será auferido e determinado nos documentos definitivos da operação de aquisição.

O preço da operação deverá ser pago da seguinte forma:

- {{percentual_a_vista}}% ({{percentual_a_vista_extenso}}) do Preço de Aquisição à vista, no ato de assinatura do Contrato definitivo;
- O valor remanescente em {{numero_parcelas}} ({{numero_parcelas_extenso}}) parcelas {{tipo_parcelas}}, iniciando-se {{prazo_inicio_parcelas_dias}} ({{prazo_inicio_parcelas_extenso}}) dias após a assinatura do Contrato definitivo.


## 2. Período de exclusividade

Tendo em vista o interesse das partes em executar a Transação, visando realizar a Diligência de maneira confidencial e tranquila para as partes envolvidas, a {{comprador_apelido}}, durante um período de {{prazo_exclusividade_dias}} ({{prazo_exclusividade_extenso}}) dias, contado a partir da presente data ("**Período de Exclusividade**"), terá exclusividade na avaliação dos ativos e operações da {{vendedor_apelido}}. Nesse sentido, ao aceitar os termos do presente contrato, a {{vendedor_apelido}} se compromete a, durante todo o Período de Exclusividade:

(a) auxiliar a Vispe e seus assessores a conduzirem os procedimentos de Diligência, bem como a negociar em boa-fé visando à celebração dos documentos que formalizarão a Transação;

(b) não celebrar, direta ou indiretamente, qualquer outro compromisso ou contrato com qualquer terceiro que tenha o mesmo objeto da Transação, seja similar à Transação, ou que esteja de qualquer forma relacionado à Transação ou cujo conteúdo seja similar ao deste Documento;

(c) não iniciar ou manter, direta ou indiretamente, qualquer discussão ou negociação com eventuais novos proponentes que tenha o mesmo objeto da Transação, seja similar à Transação, ou que tenha o mesmo objeto (ou similar) deste Documento.


## 3. Confidencialidade

As condições desta Proposta Não Vinculante devem ser mantidas confidenciais e não deverão ser compartilhadas com quaisquer terceiros. Esta Proposta não Vinculante não deve ser interpretada como proposta vinculante, devendo ser interpretada como uma base preliminar para eventuais tratativas dos contratos definitivos da potencial Transação, que poderá, ou não, ocorrer, com resultado satisfatório após auditoria.


## 4. Lei aplicável

Este Contrato reger-se-á pelas leis da República Federativa do Brasil.


## 5. Foro

As Partes elegem irrevogavelmente o Foro da cidade de **{{foro_cidade}}, {{foro_uf}}**, para dirimir quaisquer dúvidas ou disputas oriundas do presente instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.


---

**{{local_assinatura_cidade}}/{{local_assinatura_uf}}, {{data_assinatura_extenso}}.**


[PÁGINA EXCLUSIVA PARA ASSINATURAS — VENDEDORA, COMPRADORA, Vispe Capital e 2 testemunhas Vispe]

_Rubricas: Testemunhas | Rubricas: INTERESSADAS e VISPE_$TPL$,
  customizable_fields = '[
    {"key":"vendedor_razao_social","label":"Razão Social do Vendedor","required":true,"category":"partes"},
    {"key":"vendedor_tipo_societario","label":"Tipo Societário do Vendedor","required":true,"default":"sociedade empresária limitada","options":["sociedade empresária limitada","sociedade empresária unipessoal","sociedade anônima","EIRELI"],"category":"partes"},
    {"key":"vendedor_cnpj","label":"CNPJ do Vendedor","required":true,"validation":"cnpj","category":"partes"},
    {"key":"vendedor_endereco_completo","label":"Endereço Completo do Vendedor","required":true,"category":"partes","hint":"Rua, número, bairro, cidade/UF, CEP"},
    {"key":"vendedor_apelido","label":"Apelido do Vendedor (sigla/marca)","required":true,"category":"partes","hint":"Ex: HAD, ETECC, JoãoNet. Usado durante o documento.","auto_derive_from":"vendedor_razao_social_first_word"},
    {"key":"vendedor_representante_qualificacao","label":"Qualificação do Representante do Vendedor","required":true,"category":"partes","hint":"Ex: seu procurador, o Sr. ALEXANDRE GAMEIRO, brasileiro, casado, administrador, RG 22.597.580, CPF 156.251.958-11, residente em...","is_critical_data":true},
    {"key":"comprador_razao_social","label":"Razão Social do Comprador","required":true,"category":"partes"},
    {"key":"comprador_tipo_societario","label":"Tipo Societário do Comprador","required":true,"default":"pessoa jurídica de direito privado","options":["pessoa jurídica de direito privado","sociedade empresária limitada","sociedade anônima"],"category":"partes"},
    {"key":"comprador_cnpj","label":"CNPJ do Comprador","required":true,"validation":"cnpj","category":"partes"},
    {"key":"comprador_endereco_completo","label":"Endereço Completo do Comprador","required":true,"category":"partes","hint":"Rua, número, bairro, cidade/UF, CEP. Cidade da Compradora será usada pra derivar o foro automaticamente."},
    {"key":"comprador_apelido","label":"Apelido do Comprador (sigla/marca)","required":true,"category":"partes","auto_derive_from":"comprador_razao_social_first_word"},
    {"key":"comprador_cidade_sede","label":"Cidade-sede do Comprador","required":true,"category":"partes","hint":"Cidade onde fica a sede da Compradora — usada pra derivar o foro automaticamente.","auto_derive_from":"comprador_endereco_completo"},
    {"key":"comprador_uf_sede","label":"UF da sede do Comprador","required":true,"category":"partes","auto_derive_from":"comprador_endereco_completo"},
    {"key":"comprador_representante_qualificacao","label":"Qualificação do Representante do Comprador","required":true,"category":"partes","is_critical_data":true},
    {"key":"tipo_transacao","label":"Tipo de Transação","required":true,"category":"objeto","options":["ativos_rede_fundos_equipamentos","participacao_societaria","carteira_clientes","fundo_comercio_completo"],"labels":{"ativos_rede_fundos_equipamentos":"Venda de Ativos, rede, fundos de comércio e equipamentos (padrão ISP)","participacao_societaria":"Venda de participação societária (CNPJ)","carteira_clientes":"Venda de carteira de clientes","fundo_comercio_completo":"Venda de fundo de comércio completo"}},
    {"key":"objeto_descricao_completa","label":"Descrição Completa do Objeto","required":true,"category":"objeto","default_per_tipo_transacao":{"ativos_rede_fundos_equipamentos":"Venda de Ativos, rede de telecomunicações, Fundos de Comércio e equipamentos instalados em residência de eventuais clientes ativos da Parte Interessada na Venda, com tudo que integra a operação;","participacao_societaria":"Venda de 100% (cem por cento) das quotas representativas do capital social da Parte Interessada na Venda, com todos os direitos e obrigações inerentes;","carteira_clientes":"Venda da carteira de clientes ativos da Parte Interessada na Venda, incluindo contratos vigentes e relacionamento comercial estabelecido;","fundo_comercio_completo":"Venda do fundo de comércio completo da Parte Interessada na Venda, incluindo ativos, contratos, marca e clientela;"}},
    {"key":"valor_por_unidade","label":"Valor por Unidade (R$)","required":true,"type":"number","category":"preco","hint":"Valor por cliente, por quota, por equipamento — depende do tipo de transação."},
    {"key":"unidade_negociada","label":"Unidade Negociada","required":true,"category":"preco","options":["cliente ativo","quota","ponto de presença","equipamento","outra"],"default_per_tipo_transacao":{"ativos_rede_fundos_equipamentos":"cliente ativo","participacao_societaria":"quota","carteira_clientes":"cliente ativo"}},
    {"key":"quantidade_unidades","label":"Quantidade de Unidades","required":true,"type":"number","category":"preco","hint":"Número de clientes ativos, quotas, equipamentos, etc."},
    {"key":"valor_total_numerico","label":"Valor Total (R$) - calculado","required":true,"type":"number","category":"preco","auto_calculate":"valor_por_unidade * quantidade_unidades","readonly":true},
    {"key":"percentual_a_vista","label":"% à vista no Contrato definitivo","required":true,"type":"number","category":"pagamento","default":40,"min":0,"max":100,"hint":"Padrão Vispe: 40%. Restante vai pra parcelado."},
    {"key":"numero_parcelas","label":"Número de Parcelas do Restante","required":true,"type":"number","category":"pagamento","default":24,"hint":"Padrão Vispe: 24 parcelas mensais consecutivas."},
    {"key":"tipo_parcelas","label":"Tipo de Parcelas","required":true,"category":"pagamento","default":"mensais e consecutivas","options":["mensais e consecutivas","trimestrais","semestrais"]},
    {"key":"prazo_inicio_parcelas_dias","label":"Dias após assinatura pra iniciar parcelas","required":true,"type":"number","category":"pagamento","default":30},
    {"key":"prazo_exclusividade_dias","label":"Prazo de Exclusividade (dias)","required":true,"type":"number","category":"exclusividade","default":30,"hint":"Padrão Vispe: 30 dias."},
    {"key":"foro_cidade","label":"Cidade do Foro","required":true,"category":"foro","auto_derive_from":"comprador_cidade_sede","hint":"Por padrão Vispe, foro é eleito na cidade-sede da Compradora ou cidade próxima na mesma região."},
    {"key":"foro_uf","label":"UF do Foro","required":true,"category":"foro","auto_derive_from":"comprador_uf_sede"},
    {"key":"local_assinatura_cidade","label":"Cidade de Assinatura","required":true,"category":"assinatura","auto_derive_from":"foro_cidade"},
    {"key":"local_assinatura_uf","label":"UF de Assinatura","required":true,"category":"assinatura","auto_derive_from":"foro_uf"},
    {"key":"data_assinatura_extenso","label":"Data de Assinatura por Extenso","required":true,"category":"assinatura","hint":"Ex: 30 de março de 2026"},
    {"key":"termos_adicionais_ia","label":"Termos Adicionais (IA interpreta)","required":false,"category":"extras","type":"textarea","hint":"Quaisquer particularidades do deal que a IA deve considerar ao redigir. Ex: Compradora absorve passivo de R$ X, Vendedora garante manutenção de 80% base por 6 meses."}
  ]'::jsonb,
  static_clauses = '[
    {"key":"preambulo_proposito","title":"Preâmbulo - Propósito da NBO","is_frozen":true,"body":"Frase obrigatória: tendo a presente Proposta como escopo concluir a Transação de maneira tranquila e em uma curta janela de tempo. — usar exatamente esta redação, não substituir tranquila por eficiente."},
    {"key":"vispe_intermediadora","title":"Vispe como Parte Intermediadora","is_frozen":true,"body":"VISPE CAPITAL CONSULTORIA EMPRESARIAL LTDA, CNPJ 31.526.112/0001-04, sede em Gravataí/RS, é SEMPRE a Parte Intermediadora — frase obrigatória: atuando como Parte Intermediadora a Vispe."},
    {"key":"exclusividade_padrao","title":"Exclusividade padrão Vispe","is_frozen":true,"body":"Período padrão de 30 dias, salvo informação contrária. Frase de abertura obrigatória: Tendo em vista o interesse das partes em executar a Transação, visando realizar a Diligência de maneira confidencial e tranquila para as partes envolvidas..."},
    {"key":"estrutura_pagamento_padrao","title":"Estrutura de pagamento padrão Vispe","is_frozen":false,"body":"40% à vista no Contrato definitivo + 60% em 24 parcelas mensais consecutivas, iniciando 30 dias após assinatura. Configurável por deal."},
    {"key":"foro_regra","title":"Regra de Foro Vispe","is_frozen":true,"body":"Foro padrão é eleito na cidade-sede da Compradora ou cidade próxima da mesma região metropolitana."},
    {"key":"rodape_rubricas","title":"Rodapé de rubricas","is_frozen":true,"body":"Todo NBO termina com: Rubricas: Testemunhas | Rubricas: INTERESSADAS e VISPE"}
  ]'::jsonb,
  preferred_model = 'claude-sonnet-4-5',
  updated_at = now()
WHERE code = 'legal_nbo_v1';
