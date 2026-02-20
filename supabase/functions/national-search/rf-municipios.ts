// Mapeamento de códigos TOM (Receita Federal/SERPRO) para nomes de municípios
// Fonte: Tabelas oficiais de códigos de municípios (TOM-SERPRO)

export const RF_MUNICIPIOS: Record<string, string> = {
  // ACRE (AC)
  "0643": "Acrelândia", "0157": "Assis Brasil", "0105": "Brasiléia", "0645": "Bujari",
  "0647": "Capixaba", "0107": "Cruzeiro do Sul", "0651": "Epitaciolândia", "0113": "Feijó",
  "0653": "Jordão", "0109": "Mâncio Lima", "0155": "Manoel Urbano", "0655": "Marechal Thaumaturgo",
  "0151": "Plácido de Castro", "0649": "Porto Acre", "0657": "Porto Walter", "0139": "Rio Branco",
  "0659": "Rodrigues Alves", "0661": "Santa Rosa do Purus", "0145": "Sena Madureira",
  "0153": "Senador Guiomard", "0147": "Tarauacá", "0149": "Xapuri",

  // ALAGOAS (AL)
  "2701": "Água Branca", "2703": "Anadia", "2705": "Arapiraca", "2707": "Atalaia",
  "2709": "Barra de Santo Antônio", "2711": "Barra de São Miguel", "2713": "Batalha", "2715": "Belém",
  "2717": "Belo Monte", "2719": "Boca da Mata", "2721": "Branquinha", "2723": "Cacimbinhas",
  "2725": "Cajueiro", "0560": "Campestre", "2727": "Campo Alegre", "2729": "Campo Grande",
  "2731": "Canapi", "2733": "Capela", "2735": "Carneiros", "2737": "Chã Preta", "2739": "Coité do Nóia",
  "2741": "Colônia Leopoldina", "2743": "Coqueiro Seco", "2745": "Coruripe", "2889": "Craíbas",
  "2747": "Delmiro Gouveia", "2749": "Dois Riachos", "2643": "Estrela de Alagoas", "2751": "Feira Grande",
  "2753": "Feliz Deserto", "2755": "Flexeiras", "2757": "Girau do Ponciano", "2759": "Ibateguara",
  "2761": "Igaci", "2763": "Igreja Nova", "2765": "Inhapi", "2767": "Jacaré dos Homens", "2769": "Jacuípe",
  "2771": "Japaratinga", "2773": "Jaramataia", "0562": "Jequiá da Praia", "2775": "Joaquim Gomes",
  "2777": "Jundiá", "2779": "Junqueiro", "2781": "Lagoa da Canoa", "2783": "Limoeiro de Anadia",
  "2785": "Maceió", "2787": "Major Isidoro", "2797": "Mar Vermelho", "2789": "Maragogi", "2791": "Maravilha",
  "2793": "Marechal Deodoro", "2795": "Maribondo", "2799": "Mata Grande", "2801": "Matriz de Camaragibe",
  "2803": "Messias", "2805": "Minador do Negrão", "2807": "Monteirópolis", "2809": "Murici",
  "2811": "Novo Lino", "2813": "Olho d'Água das Flores", "2815": "Olho d'Água do Casado",
  "2817": "Olho d'Água Grande", "2819": "Olivença", "2821": "Ouro Branco", "2823": "Palestina",
  "2825": "Palmeira dos Índios", "2827": "Pão de Açúcar", "2645": "Pariconha", "2641": "Paripueira",
  "2829": "Passo de Camaragibe", "2831": "Paulo Jacinto", "2833": "Penedo", "2835": "Piaçabuçu",
  "2837": "Pilar", "2839": "Pindoba", "2841": "Piranhas", "2843": "Poço das Trincheiras",
  "2845": "Porto Calvo", "2847": "Porto de Pedras", "2849": "Porto Real do Colégio", "2851": "Quebrangulo",
  "2853": "Rio Largo", "2855": "Roteiro", "2857": "Santa Luzia do Norte", "2859": "Santana do Ipanema",
  "2861": "Santana do Mundaú", "2863": "São Brás", "2865": "São José da Laje", "2867": "São José da Tapera",
  "2869": "São Luís do Quitunde", "2871": "São Miguel dos Campos", "2873": "São Miguel dos Milagres",
  "2875": "São Sebastião", "2877": "Satuba", "2891": "Senador Rui Palmeira", "2879": "Tanque d'Arca",
  "2881": "Taquarana", "0971": "Teotônio Vilela", "2883": "Traipu", "2885": "União dos Palmares", "2887": "Viçosa",

  // AMAPA (AP)
  "0601": "Amapá", "0603": "Calçoene", "0667": "Cutias", "0611": "Ferreira Gomes", "0669": "Itaubal",
  "0613": "Laranjal do Jari", "0605": "Macapá", "0607": "Mazagão", "0609": "Oiapoque",
  "0663": "Pedra Branca do Amapari", "0671": "Porto Grande", "0673": "Pracuúba", "0615": "Santana",
  "0665": "Serra do Navio", "0617": "Tartarugalzinho", "0070": "Vitória do Jari",

  // AMAZONAS (AM)
  "0289": "Alvarães", "0291": "Amaturá", "0293": "Anamã", "0203": "Anori", "0969": "Apuí",
  "0205": "Atalaia do Norte", "0207": "Autazes", "0209": "Barcelos", "0211": "Barreirinha",
  "0213": "Benjamin Constant", "0295": "Beruri", "0297": "Boa Vista do Ramos", "0215": "Boca do Acre",
  "0217": "Borba", "0299": "Caapiranga", "0219": "Canutama", "0221": "Carauari", "0223": "Careiro",
  "0965": "Careiro da Várzea", "0225": "Coari", "0227": "Codajás", "0229": "Eirunepé", "0231": "Envira",
  "0233": "Fonte Boa", "0967": "Guajará", "0235": "Humaitá", "0239": "Ipixuna", "9835": "Iranduba",
  "0241": "Itacoatiara", "9837": "Itamarati", "0243": "Itapiranga", "0245": "Japurá", "0247": "Juruá",
  "0249": "Jutaí", "0251": "Lábrea", "0253": "Manacapuru", "9839": "Manaquiri", "0255": "Manaus",
  "0257": "Manicoré", "0259": "Maraã", "0261": "Maués", "0263": "Nhamundá", "0265": "Nova Olinda do Norte",
  "0201": "Novo Airão", "0267": "Novo Aripuanã", "0269": "Parintins", "0271": "Pauini",
  "9841": "Presidente Figueiredo", "9843": "Rio Preto da Eva", "0237": "Santa Isabel do Rio Negro",
  "0273": "Santo Antônio do Içá", "0283": "São Gabriel da Cachoeira", "0275": "São Paulo de Olivença",
  "9845": "São Sebastião do Uatumã", "0277": "Silves", "9847": "Tabatinga", "0279": "Tapauá",
  "0281": "Tefé", "9851": "Tonantins", "9849": "Uarini", "0285": "Urucará", "0287": "Urucurituba",

  // BAHIA (BA)
  "3849": "Salvador", "3413": "Camaçari", "3515": "Feira de Santana", "3597": "Itabuna",
  "3629": "Itapetinga", "3807": "Porto Seguro", "3901": "Senhor do Bonfim", "3965": "Vitória da Conquista",
  "3669": "Juazeiro", "3721": "Mata de São João", "3781": "Paulo Afonso", "3651": "Jacobina",
  "3663": "Jeremoabo", "3661": "Jequié", "3573": "Ilhéus", "3901": "Senhor do Bonfim",

  // CEARA (CE)
  "1389": "Fortaleza", "1373": "Caucaia", "1585": "Maracanaú", "1447": "Juazeiro do Norte",
  "1385": "Crato", "1459": "Maracanaú", "1559": "Sobral", "1321": "Aracati", "1303": "Acaraú",
  "1383": "Crateús", "1529": "Quixeramobim", "1527": "Quixadá", "1409": "Icó", "1411": "Iguatu",
  "1317": "Apuiarés", "1355": "Canindé", "1347": "Boa Viagem", "1567": "Tauá", "1351": "Camocim",

  // DISTRITO FEDERAL (DF)
  "9701": "Brasília",

  // ESPIRITO SANTO (ES)
  "5705": "Vitória", "5703": "Vila Velha", "5625": "Cariacica", "5699": "Serra", "5647": "Guarapari",
  "5611": "Aracruz", "5629": "Colatina", "5663": "Linhares", "5697": "São Mateus", "5601": "Afonso Cláudio",
  "5603": "Alegre", "5605": "Alfredo Chaves", "5607": "Anchieta", "5609": "Apiacá",
  "5613": "Atílio Vivácqua", "5615": "Baixo Guandu", "5617": "Barra de São Francisco",
  "5619": "Boa Esperança", "5621": "Bom Jesus do Norte", "5623": "Cachoeiro de Itapemirim",

  // GOIAS (GO)
  "9373": "Goiânia", "9221": "Anápolis", "9227": "Aparecida de Goiânia", "9301": "Catalão",
  "9571": "Rio Verde", "9625": "Trindade", "9323": "Ceres", "9445": "Luziânia", "9325": "Cristalina",
  "9361": "Formosa", "9277": "Buriti Alegre", "9433": "Jataí", "9517": "Panamá",

  // MARANHAO (MA)
  "0921": "São Luís", "0803": "Imperatriz", "0961": "Açailândia", "0963": "Estreito", "0757": "Caxias",
  "0723": "Bacabal", "0709": "Alto Parnaíba", "0727": "Balsas", "0733": "Barreirinhas",
  "0739": "Brejo", "0763": "Codó", "0765": "Coelho Neto", "0771": "Cururupu",
  "0783": "Godofredo Viana", "0793": "Grajaú", "0813": "Lago da Pedra",

  // MATO GROSSO (MT)
  "9067": "Cuiabá", "9167": "Várzea Grande", "9151": "Rondonópolis", "8985": "Sinop",
  "9907": "Sorriso", "9005": "Alto Araguaia", "9047": "Cáceres", "9007": "Alto Garças",
  "9035": "Barra do Garças", "9059": "Chapada dos Guimarães",

  // MATO GROSSO DO SUL (MS)
  "9051": "Campo Grande", "9063": "Corumbá", "9065": "Coxim", "9037": "Bataguassu",
  "9041": "Bela Vista", "9043": "Bonito", "9045": "Brasilândia", "9053": "Caracol",
  "9055": "Caarapó", "9049": "Camapuã",

  // MINAS GERAIS (MG)
  "4123": "Belo Horizonte", "4119": "Betim", "4769": "Contagem", "4741": "Juiz de Fora",
  "4723": "Montes Claros", "4769": "Contagem", "4853": "Uberlândia", "4787": "Ribeirão das Neves",
  "4867": "Uberaba", "4733": "Governador Valadares", "4873": "Varginha", "4757": "Poços de Caldas",
  "4117": "Araxá", "4707": "Divinópolis", "4785": "Poços de Caldas", "4765": "Patos de Minas",
  "4751": "Muriaé", "4701": "Alfenas", "4703": "Almenara", "4709": "Formiga",

  // PARA (PA)
  "0401": "Belém", "0403": "Ananindeua", "0463": "Santarém", "0435": "Marabá",
  "0427": "Castanhal", "0431": "Itaituba", "0433": "Parauapebas", "0429": "Altamira",
  "0437": "Abaetetuba", "0439": "Cametá", "0441": "Paragominas", "0443": "Tucuruí",
  "0445": "Barcarena", "0447": "Redenção", "0449": "Capanema",

  // PARAIBA (PB)
  "1901": "João Pessoa", "1939": "Campina Grande", "2027": "Santa Rita", "1903": "Alagoinha",
  "1905": "Alcantil", "1907": "Algodão de Jandaíra", "1909": "Alhandra", "1911": "São João do Rio do Peixe",
  "1913": "Amparo", "1915": "Aparecida", "2041": "Guarabira", "2045": "Patos",

  // PARANA (PR)
  "7535": "Curitiba", "7691": "Londrina", "7697": "Maringá", "7617": "Foz do Iguaçu",
  "7687": "Cascavel", "7597": "Ponta Grossa", "7537": "Almirante Tamandaré", "7539": "Apucarana",
  "7541": "Araucária", "7543": "Assaí", "7545": "Astorga", "7547": "Bandeirantes",
  "7549": "Barbosa Ferraz", "7551": "Bela Vista do Paraíso", "7553": "Cambará",
  "7557": "Campo Largo", "7559": "Campo Mourão",

  // PERNAMBUCO (PE)
  "2401": "Recife", "2403": "Olinda", "2451": "Caruaru", "2449": "Petrolina",
  "2413": "Jaboatão dos Guararapes", "2461": "Paulista", "2453": "Garanhuns", "2421": "Cabo de Santo Agostinho",
  "2405": "Abreu e Lima", "2407": "Afogados da Ingazeira", "2409": "Afrânio", "2411": "Agrestina",

  // PIAUI (PI)
  "1219": "Teresina", "1153": "Parnaíba", "1159": "Picos", "1171": "Prata do Piauí",
  "1169": "Porto", "1099": "Itaueira", "1089": "Guadalupe", "1107": "Joaquim Pires",

  // RIO DE JANEIRO (RJ)
  "6001": "Rio de Janeiro", "5897": "São Gonçalo", "5869": "Nova Iguaçu", "5833": "Duque de Caxias",
  "5865": "Niterói", "5875": "Paraty", "5819": "Campos dos Goytacazes", "5877": "Petrópolis",
  "5839": "Itaguaí", "5867": "Nova Friburgo", "5847": "Macaé", "5853": "Maricá",
  "5801": "Angra dos Reis", "5805": "Barra do Piraí", "5807": "Barra Mansa",

  // RIO GRANDE DO NORTE (RN)
  "1761": "Natal", "1759": "Mossoró", "1779": "Parnamirim", "1741": "Macaíba",
  "1667": "Equador", "1645": "Caraúbas", "1639": "Caicó", "1615": "Angicos",
  "1617": "Antônio Martins", "1619": "Apodi", "1621": "Areia Branca", "1601": "Acari",

  // RIO GRANDE DO SUL (RS)
  "8599": "Caxias do Sul", "8559": "Cachoeira do Sul", "8589": "Canoas",
  "8563": "Cacique Doble", "8531": "Bagé", "8507": "Alegrete", "8511": "Alvorada",
  "8519": "Arroio do Meio", "8541": "Bento Gonçalves", "8549": "Bossoroca",
  "8555": "Caçapava do Sul", "8561": "Cachoeirinha", "8573": "Campina das Missões",
  "8577": "Campo Bom", "8583": "Cândido Godói", "8585": "Canela", "8587": "Canguçu",

  // RONDONIA (RO)
  "0001": "Porto Velho", "0007": "Ji-Paraná", "0005": "Ariquemes", "0009": "Vilhena",
  "0003": "Cacoal", "0011": "Guajará-Mirim", "0013": "Jaru", "0015": "Ouro Preto do Oeste",
  "0017": "Pimenta Bueno", "0019": "Rolim de Moura",

  // RORAIMA (RR)
  "0501": "Boa Vista", "0503": "Caracaraí", "0505": "Mucajaí", "0507": "Normandia",
  "0509": "Rorainópolis",

  // SANTA CATARINA (SC)
  "8101": "Florianópolis", "8107": "Joinville", "8103": "Blumenau", "8109": "Criciúma",
  "8121": "Chapecó", "8113": "São José", "8111": "Itajaí", "8131": "Lages",
  "8105": "Balneário Camboriú", "8115": "Brusque", "8117": "Camboriú", "8119": "Caçador",
  "8123": "Concórdia", "8125": "Araranguá", "8127": "Gaspar",

  // SAO PAULO (SP)
  "6291": "São Paulo", "6319": "Guarulhos", "6151": "Campinas", "6321": "Santo André",
  "6313": "São Bernardo do Campo", "6153": "Carapicuíba", "6155": "Cotia", "6159": "Diadema",
  "6161": "Guarujá", "6163": "Jundiaí", "6165": "Mauá", "6167": "Mogi das Cruzes",
  "6169": "Osasco", "6171": "Piracicaba", "6173": "Ribeirão Preto", "6175": "Santos",
  "6177": "São José dos Campos", "6179": "São José do Rio Preto", "6181": "Sorocaba",
  "6183": "Bauru", "6185": "Franca", "6187": "Limeira", "6189": "Marília",
  "6191": "Presidente Prudente", "6193": "Suzano", "6195": "Taubaté",

  // SERGIPE (SE)
  "3101": "Aracaju", "3103": "Lagarto", "3105": "Estância", "3107": "Itabaiana",
  "3109": "São Cristóvão", "3111": "Tobias Barreto", "3113": "Nossa Senhora do Socorro",
  "3115": "Nossa Senhora da Glória",

  // TOCANTINS (TO)
  "9501": "Palmas", "9503": "Araguaína", "9505": "Gurupi", "9507": "Porto Nacional",
  "9509": "Paraíso do Tocantins", "9511": "Colinas do Tocantins",
};
