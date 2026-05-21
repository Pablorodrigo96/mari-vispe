-- Atualiza template legal_nda_v1 com NDA oficial Vispe (3 partes: Intermediadora, Reveladora, Receptora)
UPDATE public.doc_templates
SET
  label = 'NDA Vispe — Acordo de Confidencialidade (3 partes)',
  description = 'Acordo de Confidencialidade oficial Vispe Capital, formato 3 partes (Intermediadora, Reveladora, Receptora). Texto homologado conforme NDAs JET NET/SISTEL FIBRA e ULTRACOM/FIBRAMAR.',
  ai_instructions = 'Use EXATAMENTE o texto oficial em static_clauses. A Vispe Capital (CNPJ 31.526.112/0001-04, Gravataí/RS, repr. Pablo Rodrigo Constantino Crecencio) sempre figura como Parte Intermediadora — NÃO substitua. Preencha apenas Reveladora, Receptora, foro e data. Mantenha numeração de cláusulas (I a VII) e a estrutura de rubricas/assinaturas idêntica ao padrão Vispe. NÃO invente cláusulas adicionais.',
  customizable_fields = jsonb_build_array(
    jsonb_build_object('key','reveladora_nome','label','Razão social da Parte Reveladora (vendedor)','type','text','required',true),
    jsonb_build_object('key','reveladora_cnpj','label','CNPJ da Reveladora','type','cnpj','required',true),
    jsonb_build_object('key','reveladora_endereco','label','Endereço completo da Reveladora','type','textarea','required',true),
    jsonb_build_object('key','reveladora_representante','label','Representante legal da Reveladora','type','text','required',true),
    jsonb_build_object('key','reveladora_rep_cpf','label','CPF do representante da Reveladora','type','text','required',true),
    jsonb_build_object('key','reveladora_representante_2','label','2º representante da Reveladora (opcional)','type','text','required',false),
    jsonb_build_object('key','reveladora_rep_cpf_2','label','CPF do 2º representante (opcional)','type','text','required',false),
    jsonb_build_object('key','receptora_nome','label','Razão social da Parte Receptora (comprador)','type','text','required',true),
    jsonb_build_object('key','receptora_cnpj','label','CNPJ da Receptora','type','cnpj','required',true),
    jsonb_build_object('key','receptora_endereco','label','Endereço completo da Receptora','type','textarea','required',true),
    jsonb_build_object('key','receptora_representante','label','Representante legal da Receptora','type','text','required',true),
    jsonb_build_object('key','receptora_rep_cpf','label','CPF do representante da Receptora','type','text','required',true),
    jsonb_build_object('key','foro_cidade','label','Cidade do foro','type','text','required',true,'default','São Paulo'),
    jsonb_build_object('key','foro_uf','label','UF do foro','type','text','required',true,'default','SP'),
    jsonb_build_object('key','cidade_assinatura','label','Cidade da assinatura','type','text','required',true,'default','Porto Alegre/RS'),
    jsonb_build_object('key','data_assinatura','label','Data da assinatura','type','date','required',true)
  ),
  static_clauses = jsonb_build_array(
    jsonb_build_object(
      'id','preambulo',
      'title','Preâmbulo — Identificação das Partes',
      'mandatory',true,
      'body','Pelo presente as partes:\n\ni. VISPE CAPITAL CONSULTORIA EMPRESARIAL LTDA, pessoa jurídica, inscrita no CNPJ sob n.º 31.526.112/0001-04, com sede na Rua Adolfo Inácio de Barcelos, nº 1003, 4º andar, Centro, Gravataí, RS, CEP: 94035-360, neste ato representada na conformidade do seu contrato social por Pablo Rodrigo Constantino Crecencio, RG 5119950458 SSP/DI RS ("Parte Intermediadora"),\n\nii. {{reveladora_nome}}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob n.º {{reveladora_cnpj}}, com sede em {{reveladora_endereco}}, neste ato representada na conformidade do seu contrato social por {{reveladora_representante}}, CPF/MF {{reveladora_rep_cpf}} ("Parte Reveladora"),\n\niii. {{receptora_nome}}, pessoa jurídica, inscrita no CNPJ sob n.º {{receptora_cnpj}}, com sede em {{receptora_endereco}}, neste ato representada na conformidade do seu contrato social por {{receptora_representante}}, CPF/MF {{receptora_rep_cpf}} ("Parte Receptora").\n\nParte Receptora e Parte Reveladora conjuntamente referidas como "Partes", resolvem firmar o presente Acordo de Confidencialidade ("Acordo") nos termos que seguem. Considerando que:\n\na. A Parte Reveladora tem interesse em repassar à Parte Receptora Informações Confidenciais visando a possível análise de oportunidade de negócio ("Negócio");\nb. As Partes devem ajustar as condições de revelação das Informações Confidenciais, bem como definir as regras relativas ao seu uso e proteção; e\nc. Este Acordo refere-se ao comprometimento da Parte Receptora em manter o mais absoluto sigilo sobre as Informações Confidenciais que venham a ser fornecidas pela Parte Reveladora, para o fim específico de serem utilizadas conforme especificado no item (a) acima.'
    ),
    jsonb_build_object(
      'id','clausula_1_objeto',
      'title','CLÁUSULA I — DO OBJETO',
      'mandatory',true,
      'body','1. O objetivo deste Acordo é disciplinar as condições para a revelação de Informações Confidenciais pela Parte Reveladora à Parte Receptora e definir as regras relativas ao seu uso e proteção.'
    ),
    jsonb_build_object(
      'id','clausula_2_definicao',
      'title','CLÁUSULA II — DEFINIÇÃO DE INFORMAÇÕES CONFIDENCIAIS',
      'mandatory',true,
      'body','2. As estipulações e obrigações constantes do presente Acordo serão aplicadas a toda e qualquer Informação Confidencial que seja revelada pela Parte Reveladora no âmbito deste Acordo, observado o disposto na Cláusula Sexta abaixo.\n\n2.1. Para fins deste Acordo, Informação Confidencial significa (i) toda e qualquer informação, documentos, correspondências, perguntas e/ou quaisquer outras informações, independentemente de sua forma (escrita, verbal ou de outro modo) ou natureza, incluindo, mas não se limitando a informações financeiras, operacionais, econômicas, técnicas, jurídicas, planos comerciais, de marketing, de engenharia ou programação, bem como demais informações comerciais ou know-how e/ou outros dados, sejam de caráter técnico ou não, assim como toda e qualquer outra informação não pública, material ou dado relacionado com o presente e/ou futuro Negócio e/ou operação, e quaisquer cópias ou registros dos mesmos, contidos em qualquer meio físico, que tenham sido ou sejam diretamente fornecidos ou divulgados pela Parte Reveladora à Parte Receptora estritamente no âmbito deste Acordo.\n\n2.2. Para os fins do presente Acordo, "Informação Confidencial" significa também:\na. Quaisquer análises, estudos ou outros materiais produzidos pelas Partes ou quaisquer terceiros, com base em tais Informações Confidenciais; e\nb. O próprio Acordo, e o fato de que as Partes e seus representantes estão tendo discussões e tratativas, assim como o conteúdo de tais discussões ou tratativas, ou de qualquer de seus termos e condições.\n\n2.3. A "informação" poderá revestir-se de qualquer forma, tais como, mas não se limitando a: fórmulas, algoritmos, processos, projetos, croquis, fotografias, plantas, desenhos, conceitos de produto, especificações, amostras de clientes, nomes de revendedores e/ou distribuidores, preços e custos, definições e informações mercadológicas.\n\n2.4. As Partes concordam que a obrigação de confidencialidade e demais termos previstos neste Acordo serão aplicáveis tanto à Parte Receptora quanto à Parte Reveladora com relação a toda e qualquer Informação Confidencial da contraparte que aquela venha a ter acesso por conta deste Acordo e do Negócio.'
    ),
    jsonb_build_object(
      'id','clausula_3_direitos_obrigacoes',
      'title','CLÁUSULA III — DIREITOS E OBRIGAÇÕES',
      'mandatory',true,
      'body','3. Neste ato, a Parte Receptora se compromete e se obriga a utilizar as Informações Confidenciais reveladas no âmbito deste Acordo exclusivamente para os propósitos aqui estipulados, mantendo sempre estrito sigilo acerca de tais informações, declarando que age em nome próprio e não de terceiros que ela represente ou para quem atue como intermediária.\n\n3.1. A Parte Receptora se responsabiliza pela segurança e o controle das Informações, restringindo o acesso a essas Informações Confidenciais de forma a manter a segurança e confidencialidade.\n\n3.2. A Parte Receptora compromete-se a não contatar, direta ou indiretamente, quaisquer clientes, fornecedores, parceiros comerciais ou colaboradores da Parte Reveladora, sem prévia e expressa autorização por escrito, sob as penas deste instrumento, sem prejuízo da apuração de eventuais perdas e danos.\n\n3.3. A Parte Receptora não poderá, direta ou indiretamente, aliciar, contratar ou tentar contratar colaboradores, administradores ou prestadores da Parte Reveladora, sob as penas deste instrumento, sem prejuízo da apuração de eventuais perdas e danos.\n\n3.4. A Parte Receptora não poderá utilizar as Informações Confidenciais, direta ou indiretamente, para fins concorrenciais, estratégicos ou comerciais diversos da avaliação do Negócio, ainda que não haja divulgação a terceiros.\n\n3.5. O acesso às Informações Confidenciais poderá ocorrer por meio de data room virtual, sendo obrigatória a manutenção de logs de acesso e identificação de usuários, os quais poderão ser auditados pela Parte Reveladora.'
    ),
    jsonb_build_object(
      'id','clausula_4_uso',
      'title','CLÁUSULA IV — DO USO DAS INFORMAÇÕES',
      'mandatory',true,
      'body','4. A Parte Receptora poderá revelar as Informações Confidenciais apenas a seus funcionários, prepostos, agentes, prestadores de serviços, administradores, consultores (inclusive, sem restrições, consultores financeiros, conselheiros e contadores) e controladores ("Representantes") que precisem conhecê-las para a consecução dos fins deste Acordo; tais Representantes deverão ser devidamente advertidos acerca da natureza confidencial de tais informações, ficando, desde já, vinculados ao presente Acordo para todos os fins de direito.\n\n4.1. A Parte Receptora será responsável por qualquer infração aos termos deste Acordo cometida por quaisquer de seus Representantes.'
    ),
    jsonb_build_object(
      'id','clausula_5_devolucao',
      'title','CLÁUSULA V — DA DEVOLUÇÃO DAS INFORMAÇÕES',
      'mandatory',true,
      'body','5. Todas as Informações Confidenciais no âmbito deste Acordo permanecerão de propriedade exclusiva da Parte Reveladora, e mediante pedido da Parte Reveladora a Parte Receptora devolverá ou destruirá imediatamente todas as Informações Confidenciais, incluindo, mas não se limitando a documentos escritos, gravações sonoras e/ou visuais e arquivos eletrônicos.\n\n5.1. A Parte Receptora deverá apresentar declaração formal, assinada por seus representantes legais, atestando a destruição integral das Informações Confidenciais, incluindo cópias, backups e arquivos digitais, no prazo de 10 (dez) dias da solicitação.'
    ),
    jsonb_build_object(
      'id','clausula_6_limitacoes',
      'title','CLÁUSULA VI — LIMITAÇÕES DA CONFIDENCIALIDADE',
      'mandatory',true,
      'body','6. As estipulações e obrigações constantes do presente Acordo não serão aplicadas a nenhuma informação que:\na. Seja de domínio público no momento da revelação ou após a revelação;\nb. Já esteja em poder da Parte Receptora no momento da assinatura do presente Acordo como resultado de sua própria pesquisa;\nc. Seja recebida de boa-fé pela Parte Receptora de terceiros que tenham o direito de divulgá-las, havendo a necessidade de verificação prévia por parte da Parte Receptora quanto à legitimidade de terceiros em divulgar tais informações; e\nd. Seja revelada pela Parte Receptora na ocorrência de qualquer exigência legal (aí incluídas as exigências em virtude de lei, decisão judicial ou administrativa ou por determinação de autoridade competente), devendo ocorrer a divulgação na medida necessária ao seu cumprimento, sem prejuízo das demais Informações Confidenciais. Na ocorrência dessa hipótese a Parte Receptora deverá, o quanto antes, comunicar a Parte Reveladora para que seja dada à mesma a oportunidade de tomar as medidas cabíveis para oposição da divulgação das informações, se for o caso.\n\n6.1. Na hipótese de exigência legal, judicial ou administrativa formal, escrita e devidamente fundamentada, a Parte Receptora poderá divulgar Informações Confidenciais, estritamente na extensão exigida, desde que:\n(i) notifique previamente a Parte Reveladora, por escrito e com antecedência mínima razoável, salvo vedação legal;\n(ii) coopere integralmente com a Parte Reveladora para limitar ou impedir a divulgação, inclusive mediante adoção de medidas judiciais cabíveis;\n(iii) adote todas as medidas necessárias para assegurar o tratamento confidencial das informações, incluindo requerimento de sigilo perante a autoridade competente; e\n(iv) restrinja a divulgação ao mínimo necessário ao cumprimento da obrigação legal.\n\n6.2. O ônus de provar a inexistência de qualquer das hipóteses descritas nesta Cláusula Sexta caberá à parte que alegar o descumprimento dos termos de confidencialidade conforme estipulado no presente instrumento.'
    ),
    jsonb_build_object(
      'id','clausula_7_disposicoes_gerais',
      'title','CLÁUSULA VII — DAS DISPOSIÇÕES GERAIS',
      'mandatory',true,
      'body','7. Este Acordo constitui a totalidade de entendimentos entre as Partes acerca do objeto pactuado, e substitui todos e quaisquer entendimentos, contratos ou acordos prévios, escritos ou verbais.\n\n7.1. As notificações de uma parte a outra presumir-se-ão válidas se realizadas por correspondência registrada entregue nos respectivos endereços inscritos no preâmbulo deste Acordo ou por qualquer outro meio capaz de, inequivocamente, comprovar o efetivo recebimento da comunicação pelo destinatário.\n\n7.2. A Parte Receptora se compromete a fazer uso das Informações Confidenciais para fins exclusivamente destinados ao seu objeto, respondendo por eventuais perdas e danos, materiais ou morais identificados e comprovadamente decorrentes de sua responsabilidade, eventualmente decorrentes de revelação não autorizada de informações, exceto quanto ao previsto na Cláusula Sexta acima, desde que devidamente comprovada sua responsabilidade em eventual divulgação indevida de Informações Confidenciais.\n\n7.3. As obrigações de confidencialidade permanecerão vigentes por prazo mínimo de 5 (cinco) anos, contados da última divulgação de Informações Confidenciais, ou por prazo indeterminado no que se refere a informações estratégicas, comerciais sensíveis, segredos de negócio e know-how.\n\n7.4. O presente Acordo não cria vínculos ou obrigações comerciais entre as Partes. Caso haja decisão pela realização de qualquer Negócio, deverá ser assinado acordo ou contrato específico para tanto.\n\n7.5. As Partes elegem o foro central da Comarca de {{foro_cidade}}, Estado de {{foro_uf}}, com exclusão de qualquer outro por mais privilegiado que seja, para dirimir qualquer controvérsia ou disputa relacionada ao presente documento.'
    ),
    jsonb_build_object(
      'id','fechamento_assinaturas',
      'title','Local, Data e Assinaturas',
      'mandatory',true,
      'body','{{cidade_assinatura}}, {{data_assinatura}}.\n\nINTERMEDIADORA:\n_________________________________________\nVISPE CAPITAL CONSULTORIA EMPRESARIAL LTDA\nPablo Rodrigo Constantino Crecencio\n\nREVELADORA:\n_________________________________________\n{{reveladora_nome}}\n{{reveladora_representante}}\n\nRECEPTORA:\n_________________________________________\n{{receptora_nome}}\n{{receptora_representante}}\n\nTestemunhas:\n\n_________________________________________\nNome:\nCPF:\n\n_________________________________________\nNome:\nCPF:'
    )
  ),
  preferred_model = COALESCE(preferred_model, 'claude-sonnet-4-5'),
  is_active = true,
  updated_at = now()
WHERE code = 'legal_nda_v1';