/* SISTRAFA — dados de referência (conteúdo inicial, deve ser validado por especialistas) */
'use strict';

const GRUPOS = {
  aves:      { nome: 'Aves',        singular: 'Ave',        icone: 'ave',   cor: '#7FD6FF' },
  mamiferos: { nome: 'Mamíferos',   singular: 'Mamífero',   icone: 'pata',    cor: '#FFC27A' },
  repteis:   { nome: 'Répteis',     singular: 'Réptil',     icone: 'cobra',  cor: '#01DE82' },
  anfibios:  { nome: 'Anfíbios',    singular: 'Anfíbio',    icone: 'sapo',   cor: '#B6F36A' },
  outros:    { nome: 'Invertebrados e outros', singular: 'Invertebrado/outro', icone: 'inseto', cor: '#FF9FB0' },
  naoid:     { nome: 'Grupo não identificado', singular: 'Não identificado', icone: 'ajuda', cor: '#C9D6D2' }
};

/* Orientações gerais por grupo — exibidas na etapa de manejo e no guia.
   Contenção e transporte por grupo conforme o protocolo operacional de Dallabrida et al. (2026, em elaboração). */
const ORIENTACOES_GRUPO = {
  aves: [
    'Reduza ruído, luz e movimentação ao redor. Aves se estressam com facilidade.',
    'Para conter, use rede de malha macia ou pano e mantenha as asas firmes junto ao corpo. Não comprima o peito: as aves não têm diafragma e dependem do movimento do tórax para respirar.',
    'Cobrir a cabeça com um pano reduz os estímulos visuais e acalma a ave.',
    'Aves de rapina (gaviões, corujas): o maior risco são as garras. Controle primeiro as patas, com luvas de couro ou raspa.',
    'Aves de bico longo e afiado (garças, por exemplo) atacam o rosto: use óculos de proteção ou viseira. Papagaios, araras e tucanos dão bicadas fortes.',
    'Transporte em caixa escura e ventilada, com espaço para a ave se acomodar, mas restrito o bastante para limitar batidas de asa (risco de fratura). Nunca transporte várias aves espremidas.',
    'Não ofereça água ou alimento à força.'
  ],
  mamiferos: [
    'Todo mamífero silvestre pode transmitir raiva, sarna e outras zoonoses. Não toque sem luvas de proteção.',
    'Morcegos: nunca manuseie sem luvas grossas. Qualquer contato ou mordida deve ser comunicado à vigilância em saúde (risco de raiva).',
    'Prefira contenção indireta: puçá, rede, cambão ou caixa de contenção. Evite o contato com as mãos.',
    'Em animais pequenos, um pano ou saco de contenção sobre o corpo reduz os estímulos visuais e o estresse.',
    'Mantenha rota de fuga livre para o animal sempre que possível. Animais acuados tendem a atacar.',
    'Animais de médio e grande porte (capivara, onça, tamanduá, cervo) exigem equipe e equipamento especializados.',
    'No transporte, o animal deve manter uma postura natural, sem contenção que dificulte a respiração ou a circulação.',
    'Um filhote que parece sozinho pode estar com a mãe por perto. Observe antes de recolher.'
  ],
  repteis: [
    'Considere toda serpente peçonhenta até que se prove o contrário.',
    'Serpentes peçonhentas: manejo somente por pessoa capacitada, com gancho ou pinção. Mantenha distância e nunca segure com as mãos.',
    'Transporte serpentes peçonhentas em caixa rígida (madeira ou plástico resistente), vedada, trancada e identificada como "animal perigoso". Não abra a caixa até chegar a um local seguro, com pessoal especializado.',
    'Serpentes não peçonhentas: use gancho ou pinça e apoie o corpo em vários pontos, para não lesionar a coluna.',
    'Lagartos: nunca segure pela cauda, que pode se soltar (autotomia). Lagartos grandes (teiú) mordem com força: contenha cabeça e base da cauda.',
    'Quelônios (cágados, jabutis): segure pelas laterais do casco, entre as patas da frente e as de trás, apoiando o corpo. Evite quedas, que podem fraturar o casco.',
    'Jacarés exigem equipe especializada. Isole a área e não se aproxime da boca nem da cauda.',
    'Répteis são muito sensíveis ao calor: transporte em recipiente fechado, opaco e ventilado, nunca exposto ao sol.'
  ],
  anfibios: [
    'Anfíbios têm a pele fina e permeável, que absorve resíduos das mãos. Algumas espécies liberam toxinas pela pele.',
    'Use luvas sem pó e mantenha-as molhadas antes do contato e durante ele. Não leve as mãos aos olhos e à boca e lave-as após o manejo.',
    'Para capturar, prefira puçá de malha fina. Não use sacos de pano: eles absorvem a umidade da pele e desidratam o animal.',
    'Coloque o animal logo em recipiente plástico com tampa ventilada, com água do próprio local, musgo úmido ou papel-toalha molhado.',
    'Mantenha o recipiente em local escuro e fresco. Calor e ar seco podem matar o animal em pouco tempo. Não use álcool ou produtos químicos.'
  ],
  outros: [
    'Escorpiões, aranhas e taturanas podem causar acidentes graves. Não manuseie com as mãos.',
    'Use pinça longa e frasco com tampa. Se não houver equipamento, isole o local.',
    'Taturanas (lagartas Lonomia) costumam ficar agrupadas em troncos. Não encoste. O contato pode causar hemorragia.',
    'Em caso de acidente, procure atendimento médico imediatamente e, se for seguro, leve uma foto do animal.'
  ],
  naoid: [
    'Grupo não identificado: adote sempre a conduta mais cautelosa.',
    'Mantenha distância, isole a área e evite contato até ter mais informações.',
    'Fotografe o animal de vários ângulos, de uma distância segura, para a identificação posterior.',
    'Antes de manejar, consulte um especialista (CETRAS, polícia ambiental ou biólogo).'
  ]
};

/* Catálogo inicial de espécies (Paraná / Sul do Brasil).
   inat = código do táxon no iNaturalist, usado para buscar as fotos de referência de todas as espécies numa só consulta */
const ESPECIES = [
  // Répteis
  { id: 'jararaca', nome: 'Jararaca', cientifico: 'Bothrops jararaca', inat: 539050, grupo: 'repteis', risco: 'alto', peconhento: true, porte: 'Médio (até ~1,6 m)',
    caracteristicas: 'Cabeça triangular destacada do corpo, fosseta loreal (orifício entre olho e narina), fundo cinza com manchas escuras em forma de "V" invertido ao longo do corpo, cauda que afina de forma gradual.',
    cuidados: 'Peçonhenta. As jararacas (grupo botrópico) causam a maioria dos acidentes ofídicos no Brasil. Não tente capturar sem gancho ou pinção herpetológico e caixa apropriada. Mantenha 2 m de distância.' },
  { id: 'cascavel', nome: 'Cascavel', cientifico: 'Crotalus durissus', inat: 30693, grupo: 'repteis', risco: 'alto', peconhento: true, porte: 'Médio a grande (até ~1,8 m)',
    caracteristicas: 'Chocalho (guizo) na ponta da cauda, desenhos em losango no dorso, cabeça triangular com fosseta loreal.',
    cuidados: 'Peçonhenta, com veneno de ação neurotóxica. O ruído do chocalho é sinal de alerta: afaste-se. Contenção apenas por equipe treinada.' },
  { id: 'coral', nome: 'Coral-verdadeira', cientifico: 'Micrurus spp.', inat: 30493, grupo: 'repteis', risco: 'alto', peconhento: true, porte: 'Pequeno a médio',
    caracteristicas: 'Anéis vermelhos, pretos e brancos/amarelos que costumam dar a volta completa no corpo. Olhos pequenos e cabeça pouco destacada.',
    cuidados: 'Peçonhenta. A coral-verdadeira é muito parecida com a falsa-coral: trate toda coral como verdadeira. Não manuseie.' },
  { id: 'jiboia', nome: 'Jiboia', cientifico: 'Boa constrictor', inat: 32093, grupo: 'repteis', risco: 'medio', peconhento: false, porte: 'Grande (até ~3 m)',
    caracteristicas: 'Corpo robusto, desenhos em sela ao longo do dorso, cabeça sem fosseta loreal, pupila vertical.',
    cuidados: 'Não peçonhenta, mas morde e faz constrição. Exemplares grandes exigem duas pessoas. Espécie frequente em tráfico e cativeiro ilegal.' },
  { id: 'teiu', nome: 'Teiú', cientifico: 'Salvator merianae', inat: 318758, grupo: 'repteis', risco: 'medio', peconhento: false, porte: 'Grande (até ~1,4 m)',
    caracteristicas: 'Lagarto grande, preto com faixas e pintas claras, cauda longa e língua bífida.',
    cuidados: 'Mordida forte e golpes de cauda. Contenha a cabeça e a base da cauda ao mesmo tempo, com luvas de raspa.' },
  { id: 'jacare', nome: 'Jacaré-de-papo-amarelo', cientifico: 'Caiman latirostris', inat: 116518, grupo: 'repteis', risco: 'alto', peconhento: false, porte: 'Grande (até ~2,5 m)',
    caracteristicas: 'Focinho largo e curto, coloração oliva, região do papo amarelada em adultos.',
    cuidados: 'Grande porte e mordida muito forte. Isole a área e acione equipe especializada. Não se aproxime da boca nem da cauda.' },
  { id: 'cagado', nome: 'Cágado-de-barbelas', cientifico: 'Phrynops hilarii', inat: 39626, grupo: 'repteis', risco: 'baixo', peconhento: false, porte: 'Pequeno a médio',
    caracteristicas: 'Casco achatado e escuro, pescoço longo que dobra para o lado, duas barbelas sob o queixo.',
    cuidados: 'Pode morder. Segure pelas laterais do casco, entre as patas da frente e as de trás, apoiando o corpo, e evite quedas. Mantenha-o úmido.' },

  // Aves
  { id: 'papagaio', nome: 'Papagaio-de-peito-roxo', cientifico: 'Amazona vinacea', inat: 18986, grupo: 'aves', risco: 'medio', peconhento: false, porte: 'Médio (até ~35 cm)',
    caracteristicas: 'Plumagem verde, peito arroxeado, bico vermelho na base, nuca com penas azuladas.',
    cuidados: 'Espécie ameaçada e muito visada pelo tráfico. Bicada forte. Registre anilhas e documentação.' },
  { id: 'trinca-ferro', nome: 'Trinca-ferro', cientifico: 'Saltator similis', inat: 9861, grupo: 'aves', risco: 'baixo', peconhento: false, porte: 'Pequeno (~20 cm)',
    caracteristicas: 'Dorso verde-oliva, cabeça cinza, sobrancelha branca, garganta branca contornada de preto.',
    cuidados: 'Muito comum em apreensões de tráfico. Verifique anilhas, gaiolas e condições de alojamento.' },
  { id: 'canario-terra', nome: 'Canário-da-terra', cientifico: 'Sicalis flaveola', inat: 9864, grupo: 'aves', risco: 'baixo', peconhento: false, porte: 'Pequeno (~14 cm)',
    caracteristicas: 'Macho amarelo intenso com testa alaranjada. Fêmeas e jovens mais pardos.',
    cuidados: 'Frequente em rinhas e tráfico. Registre a quantidade por gaiola e as condições de higiene.' },
  { id: 'coruja-buraqueira', nome: 'Coruja-buraqueira', cientifico: 'Athene cunicularia', inat: 19975, grupo: 'aves', risco: 'baixo', peconhento: false, porte: 'Pequeno (~23 cm)',
    caracteristicas: 'Coruja parda com pintas claras e pernas longas. Vive em buracos no chão, em campos e terrenos baldios.',
    cuidados: 'Garras afiadas. Controle as patas primeiro. Ninhos no solo não devem ser removidos.' },
  { id: 'gaviao-carijo', nome: 'Gavião-carijó', cientifico: 'Rupornis magnirostris', inat: 201041, grupo: 'aves', risco: 'medio', peconhento: false, porte: 'Médio (~36 cm)',
    caracteristicas: 'Ave de rapina cinza-amarronzada, peito e barriga barrados, olhos amarelos, cauda com faixas.',
    cuidados: 'As garras são o maior risco. Use luvas de raspa e cubra a cabeça da ave com um pano para acalmá-la.' },
  { id: 'tucano', nome: 'Tucano-de-bico-verde', cientifico: 'Ramphastos dicolorus', inat: 18808, grupo: 'aves', risco: 'baixo', peconhento: false, porte: 'Médio (~48 cm)',
    caracteristicas: 'Bico grande esverdeado, peito amarelo-alaranjado, corpo preto.',
    cuidados: 'Bico leve, mas a bicada machuca. Apoie o corpo e não segure pelo bico.' },
  { id: 'gralha-azul', nome: 'Gralha-azul', cientifico: 'Cyanocorax caeruleus', inat: 8481, grupo: 'aves', risco: 'baixo', peconhento: false, porte: 'Médio (~40 cm)',
    caracteristicas: 'Corpo azul intenso, cabeça e peito pretos. Ave símbolo do Paraná.',
    cuidados: 'Ave inteligente e ágil. Contenha com toalha. Comum em resgates de filhotes caídos.' },

  // Mamíferos
  { id: 'gamba', nome: 'Gambá-de-orelha-branca', cientifico: 'Didelphis albiventris', inat: 42658, grupo: 'mamiferos', risco: 'baixo', peconhento: false, porte: 'Pequeno a médio',
    caracteristicas: 'Marsupial com orelhas claras, focinho longo, cauda sem pelos. Fêmeas podem carregar filhotes no marsúpio.',
    cuidados: 'Pode morder e se fingir de morto. Verifique filhotes no marsúpio. Muito comum em áreas urbanas.' },
  { id: 'ouricacheiro', nome: 'Ouriço-cacheiro', cientifico: 'Coendou spinosus', inat: 552456, grupo: 'mamiferos', risco: 'medio', peconhento: false, porte: 'Pequeno a médio',
    caracteristicas: 'Corpo coberto de espinhos curtos misturados a pelos, cauda preênsil.',
    cuidados: 'Os espinhos se soltam e penetram na pele. Use luvas grossas e caixa ou puçá. Não segure com as mãos.' },
  { id: 'sagui', nome: 'Sagui-de-tufo-preto', cientifico: 'Callithrix penicillata', inat: 43374, grupo: 'mamiferos', risco: 'medio', peconhento: false, porte: 'Pequeno',
    caracteristicas: 'Primata pequeno com tufos pretos nas orelhas e cauda listrada. No Paraná, é espécie exótica invasora.',
    cuidados: 'Risco de mordida e de zoonoses (incluindo raiva). Não toque sem luvas. Não deve ser solto.' },
  { id: 'bugio', nome: 'Bugio-ruivo', cientifico: 'Alouatta guariba clamitans', inat: 147529, grupo: 'mamiferos', risco: 'medio', peconhento: false, porte: 'Médio',
    caracteristicas: 'Macaco robusto, pelagem ruiva (machos) ou marrom (fêmeas), vocalização muito alta.',
    cuidados: 'Espécie sentinela da febre amarela. Bugios mortos devem ser notificados à vigilância em saúde. Não agrida nem afugente o animal.' },
  { id: 'capivara', nome: 'Capivara', cientifico: 'Hydrochoerus hydrochaeris', inat: 74442, grupo: 'mamiferos', risco: 'medio', peconhento: false, porte: 'Grande (até ~60 kg)',
    caracteristicas: 'Maior roedor do mundo, de corpo marrom e focinho rombudo. Vive perto de rios e lagos.',
    cuidados: 'Grande porte. Pode carregar carrapatos-estrela (febre maculosa). Use EPI e acione equipe especializada para contenção.' },
  { id: 'quati', nome: 'Quati', cientifico: 'Nasua nasua', inat: 41670, grupo: 'mamiferos', risco: 'medio', peconhento: false, porte: 'Médio',
    caracteristicas: 'Focinho longo e móvel, cauda anelada mantida erguida, vive em bandos.',
    cuidados: 'Dentes e garras afiados. Evite contenção manual. Use caixa de transporte ou puçá.' },
  { id: 'tamandua', nome: 'Tamanduá-mirim', cientifico: 'Tamandua tetradactyla', inat: 47104, grupo: 'mamiferos', risco: 'medio', peconhento: false, porte: 'Médio',
    caracteristicas: 'Pelagem amarelada com "colete" preto, focinho longo, garras grandes nas patas dianteiras.',
    cuidados: 'Garras perigosas. Quando ameaçado, fica em pé e abraça. Mantenha distância e use equipamento.' },
  { id: 'onca-parda', nome: 'Onça-parda (puma)', cientifico: 'Puma concolor', inat: 42007, grupo: 'mamiferos', risco: 'alto', peconhento: false, porte: 'Grande',
    caracteristicas: 'Felino grande de pelagem uniforme marrom-acinzentada, cauda longa com ponta escura.',
    cuidados: 'Alto risco. Isole a área, afaste pessoas e animais domésticos e acione equipe especializada. Nunca encurrale o animal.' },
  { id: 'morcego', nome: 'Morcego (diversas espécies)', cientifico: 'Ordem Chiroptera', inat: 40268, grupo: 'mamiferos', risco: 'alto', peconhento: false, porte: 'Pequeno',
    caracteristicas: 'Único mamífero voador. Morcego caído no chão ou ativo durante o dia pode estar doente.',
    cuidados: 'Risco de raiva. Nunca manuseie sem luvas grossas. Cubra o morcego com um recipiente. Qualquer contato deve ser comunicado à vigilância em saúde.' },

  // Anfíbios
  { id: 'cururu', nome: 'Sapo-cururu', cientifico: 'Rhinella spp.', inat: 64819, grupo: 'anfibios', risco: 'medio', peconhento: false, porte: 'Médio a grande',
    caracteristicas: 'Sapo grande, pele rugosa, glândulas salientes atrás dos olhos (paratoides).',
    cuidados: 'As glândulas liberam toxina irritante. Use luvas, não leve as mãos aos olhos e mantenha cães afastados.' },
  { id: 'sapo-ferreiro', nome: 'Sapo-ferreiro (perereca)', cientifico: 'Boana faber', inat: 555104, grupo: 'anfibios', risco: 'baixo', peconhento: false, porte: 'Médio',
    caracteristicas: 'Perereca grande, de cor parda, com discos adesivos nos dedos. Canto parecido com batida de martelo.',
    cuidados: 'Manuseie com luvas umedecidas. Mantenha a perereca úmida e na sombra.' },

  // Invertebrados
  { id: 'escorpiao', nome: 'Escorpião-amarelo', cientifico: 'Tityus serrulatus', inat: 468742, grupo: 'outros', risco: 'alto', peconhento: true, porte: 'Pequeno (até ~7 cm)',
    caracteristicas: 'Corpo amarelo-claro, cauda com serrilhado no dorso e ferrão na ponta.',
    cuidados: 'A picada pode ser grave, principalmente em crianças. Use pinça longa e frasco fechado. Em caso de acidente, procure atendimento imediatamente.' },
  { id: 'aranha-marrom', nome: 'Aranha-marrom', cientifico: 'Loxosceles spp.', inat: 48137, grupo: 'outros', risco: 'alto', peconhento: true, porte: 'Pequeno (até ~4 cm com as pernas esticadas)',
    caracteristicas: 'Aranha marrom de pernas finas e longas, com desenho de "violino" no cefalotórax. Vive em locais escuros e secos.',
    cuidados: 'Muito comum no Paraná. A picada é pouco dolorosa no início, mas pode causar lesões graves. Procure atendimento médico.' },
  { id: 'armadeira', nome: 'Aranha-armadeira', cientifico: 'Phoneutria spp.', inat: 53388, grupo: 'outros', risco: 'alto', peconhento: true, porte: 'Médio (até ~15 cm com patas)',
    caracteristicas: 'Aranha marrom-acinzentada. Ao se sentir ameaçada, ergue as patas da frente ("arma o bote").',
    cuidados: 'Picada muito dolorosa. Não manuseie. Use frasco e pinça longa. Em caso de acidente, procure atendimento.' },
  { id: 'lonomia', nome: 'Taturana (Lonomia)', cientifico: 'Lonomia obliqua', inat: 120509, grupo: 'outros', risco: 'alto', peconhento: true, porte: 'Pequeno (lagarta até ~7 cm)',
    caracteristicas: 'Lagartas esverdeadas ou amarronzadas com espinhos ramificados, geralmente agrupadas em troncos de árvores.',
    cuidados: 'O contato pode causar hemorragias graves. Não encoste. Em caso de contato, procure atendimento médico urgente. Existe soro específico.' }
];

/* Acesso rápido — situações de risco */
const GUIAS_RISCO = [
  { id: 'peconhentos', titulo: 'Animais peçonhentos', icone: 'caveira', cor: 'perigo',
    resumo: 'Serpentes, escorpiões, aranhas e taturanas',
    passos: [
      'Afaste as pessoas e mantenha pelo menos 2 metros de distância.',
      'Não tente matar nem capturar o animal com as mãos.',
      'Mantenha o animal sob observação à distância até a chegada da equipe com equipamento (gancho, pinção, caixa).',
      'Se for seguro, fotografe à distância para ajudar na identificação.',
      'Trate toda coral como verdadeira e toda serpente desconhecida como peçonhenta.'
    ],
    acidente: [
      'Ligue 192 (SAMU) ou leve a vítima ao hospital de referência o quanto antes.',
      'Lave o local da picada com água e sabão.',
      'Mantenha a vítima deitada, calma e hidratada. Se possível, eleve o membro atingido.',
      'Não faça torniquete, não corte, não chupe e não coloque nenhuma substância no local.',
      'Retire anéis, relógios e calçados apertados do membro atingido.',
      'Informe ao atendimento o tipo de animal (uma foto ajuda) e o horário da picada.'
    ] },
  { id: 'agressivos', titulo: 'Animais agressivos', icone: 'alerta', cor: 'alerta',
    resumo: 'Risco de mordida, bicada, arranhadura ou coice',
    passos: [
      'Não encurrale o animal. Deixe uma rota de fuga livre sempre que possível.',
      'Afaste curiosos, crianças e animais domésticos.',
      'Evite movimentos bruscos e barulho.',
      'Use EPI: luvas de raspa, óculos de proteção e roupa de manga longa.',
      'Use equipamento (cambão, puçá, caixa de transporte) em vez das mãos.',
      'Em caso de mordida ou arranhadura de mamífero, lave com água e sabão e procure atendimento (risco de raiva).'
    ] },
  { id: 'grande-porte', titulo: 'Grande porte', icone: 'grande', cor: 'alerta',
    resumo: 'Onças, jacarés, capivaras, cervos, tamanduás',
    passos: [
      'Isole a área com perímetro amplo e controle a circulação de pessoas.',
      'Não tente contenção sem equipe e equipamento especializados.',
      'Acione o CETRAS, a polícia ambiental ou uma equipe com médico-veterinário, que pode fazer contenção química se for preciso.',
      'Se o animal estiver em via, sinalize e controle o trânsito.',
      'Fotografe de uma distância segura.'
    ] },
  { id: 'via', titulo: 'Animal em via ou rodovia', icone: 'estrada', cor: 'alerta',
    resumo: 'Atropelamento ou risco para o trânsito',
    passos: [
      'Sinalize a via com cones ou viatura antes de se aproximar.',
      'Use colete refletivo.',
      'Animal atropelado e vivo: pode estar com dor e reagir. Use toalha ou caixa e evite contato direto.',
      'Animal morto: retire da pista com luvas para evitar novos acidentes e registre fotos se houver suspeita de crime.'
    ] },
  { id: 'apreensao', titulo: 'Apreensão de animais', icone: 'camadas', cor: 'alerta',
    resumo: 'Tráfico, cativeiro ilegal, muitos animais juntos',
    passos: [
      'Avalie o cenário à distância e isole o local antes de qualquer intervenção.',
      'Conte os animais e procure os que estão escondidos. Verifique filhotes, animais feridos e espécies perigosas.',
      'Fotografe o local, as gaiolas e as condições dos animais antes de mexer em qualquer coisa.',
      'Use EPI: luvas de proteção, luvas de nitrilo e, se houver fezes acumuladas ou cheiro de amônia, máscara P2.',
      'Tire os animais do sol, garanta ventilação e desfaça a superlotação, sem soltá-los.',
      'Separe por espécie, porte e condição clínica para o transporte. Não ofereça alimento.',
      'Não solte os animais no local. Avise o destino e encaminhe os animais ao CETAS, ao CETRAS ou ao órgão ambiental.'
    ] }
];

/* Fotografias recomendadas (questionário 6.1 e protocolo, seção de registro).
   A marcação é gravada pela posição: novos itens entram sempre no fim da lista. */
const FOTOS_RECOMENDADAS = [
  'Visão geral do local (macroambiente)',
  'Posição e situação em que o animal foi encontrado',
  'Animal inteiro, de diferentes ângulos',
  'Características úteis para identificação',
  'Lesões, fraturas, parasitas externos e condição corporal',
  'Gaiolas, caixas, recintos ou armadilhas (microambiente)',
  'Água, alimento, fezes e higiene',
  'Anilhas, brincos, microchips ou outras identificações',
  'Objetos e possíveis vestígios',
  'Forma de acondicionamento e transporte',
  'Condição do animal após a contenção',
  'Entrega e recebimento pela instituição de destino',
  'Sinais de maus-tratos (superlotação, contenção traumática, falta de abrigo)'
];

const ETAPAS_FOTO = {
  local: 'Local / situação inicial',
  animal: 'Animal ou lote',
  vestigio: 'Vestígio / objeto',
  contencao: 'Após contenção',
  entrega: 'Entrega'
};

/* Perguntas condicionais — avaliação de risco */
const PERGUNTAS_RISCO = [
  { id: 'riscoImediato', tipo: 'sn', texto: 'Há risco imediato para pessoas ou outros animais?',
    ajuda: 'Ex.: animal dentro de casa, perto de crianças, em escola ou em via movimentada.',
    orientacao: { sim: { nivel: 'perigo', titulo: 'Priorize a segurança', texto: 'Afaste as pessoas, isole o local e solicite equipe especializada antes de qualquer manejo.' } } },
  { id: 'vivo', tipo: 'escolha', texto: 'O animal está vivo ou morto?',
    opcoes: [['vivo', 'Vivo'], ['morto', 'Morto'], ['ambos', 'Há vivos e mortos'], ['ns', 'Não sei']],
    orientacao: {
      morto: { nivel: 'info', titulo: 'Animal morto', texto: 'Não manuseie sem luvas. Se houver suspeita de crime, preserve o local e fotografe antes de mover. Primatas mortos devem ser notificados à vigilância em saúde (febre amarela).' },
      ambos: { nivel: 'info', titulo: 'Animais vivos e mortos', texto: 'Separe os vivos dos mortos e registre cada situação. Use luvas ao manusear carcaças.' },
      ns: { nivel: 'atencao', titulo: 'Na dúvida, trate como vivo', texto: 'Animais podem parecer mortos e reagir de repente (ex.: gambás e serpentes). Mantenha distância.' } } },
  { id: 'peconhento', tipo: 'sn', texto: 'O animal é ou pode ser peçonhento?',
    ajuda: 'Serpentes, escorpiões, aranhas e taturanas. Se não souber, responda "Não sei".',
    orientacao: {
      sim: { nivel: 'perigo', titulo: 'Risco de envenenamento', texto: 'Mantenha 2 metros de distância. Não use as mãos. A contenção deve ser feita só por pessoa capacitada, com gancho ou pinção e caixa adequada.' },
      ns: { nivel: 'perigo', titulo: 'Trate como peçonhento', texto: 'Sem identificação segura, adote a conduta para animal peçonhento: distância, isolamento e apoio especializado.' } } },
  { id: 'agressivo', tipo: 'sn', texto: 'Há risco de mordida, bicada, arranhadura ou coice?',
    orientacao: { sim: { nivel: 'atencao', titulo: 'Use proteção', texto: 'Use luvas de raspa, óculos e equipamento de contenção. Não encurrale o animal e deixe rota de fuga quando possível.' } } },
  { id: 'grandePorte', tipo: 'sn', texto: 'O animal é de grande porte ou exige contenção especializada?',
    ajuda: 'Ex.: onça, jacaré, capivara, cervo, tamanduá-bandeira.',
    orientacao: { sim: { nivel: 'perigo', titulo: 'Contenção especializada', texto: 'Isole a área e acione equipe com equipamento e, se necessário, médico-veterinário para contenção química.' } } },
  { id: 'transito', tipo: 'sn', texto: 'O animal está em via ou rodovia, com risco para o trânsito?',
    orientacao: { sim: { nivel: 'atencao', titulo: 'Sinalize a via', texto: 'Sinalize com cones ou viatura e use colete refletivo antes de se aproximar.' } } },
  { id: 'manejoSeguro', tipo: 'sn', texto: 'A equipe presente consegue manejar o animal com segurança?',
    ajuda: 'Considere o EPI, os equipamentos disponíveis e a experiência da equipe.',
    quando: r => ['peconhento', 'agressivo', 'grandePorte', 'riscoImediato'].some(k => r[k] === 'sim' || (k === 'peconhento' && r[k] === 'ns')),
    orientacao: {
      nao: { nivel: 'perigo', titulo: 'Não realize o manejo', texto: 'Mantenha o isolamento e aguarde a equipe especializada.' },
      ns: { nivel: 'atencao', titulo: 'Na dúvida, aguarde apoio', texto: 'Se não tiver certeza de que é seguro, mantenha o isolamento e peça apoio.' } } }
];

/* Perguntas condicionais — contexto */
const PERGUNTAS_CONTEXTO = [
  { id: 'qtdAprox', tipo: 'numero', texto: 'Quantos animais há, aproximadamente?', ajuda: 'Uma estimativa já ajuda. Você detalha por grupo depois.' },
  { id: 'situacao', tipo: 'escolha', texto: 'Como o animal foi encontrado?',
    opcoes: [['livre', 'Livre'], ['contido', 'Já contido'], ['preso', 'Preso (armadilha, cerca, rede)'], ['cativeiro', 'Mantido em cativeiro'], ['transporte', 'Sendo transportado']] },
  { id: 'condicoesLocal', tipo: 'multi', texto: 'Em que condições os animais estão sendo mantidos?',
    ajuda: 'Observe à distância, antes de mexer em gaiolas ou caixas.',
    quando: r => ['contido', 'preso', 'cativeiro', 'transporte'].includes(r.situacao),
    opcoes: [['superlotacao', 'Superlotação'], ['ventilacao', 'Pouca ventilação'], ['sol', 'Exposição ao sol ou ao calor'], ['sujeira', 'Fezes acumuladas ou cheiro de amônia'],
      ['semAgua', 'Sem água ou alimento'], ['semAbrigo', 'Sem abrigo contra chuva ou frio'], ['nenhum', 'Nenhuma dessas condições']] },
  { id: 'filhotes', tipo: 'sn', texto: 'Há filhotes ou animais dependentes?',
    orientacao: { sim: { nivel: 'info', titulo: 'Filhotes', texto: 'Mantenha filhotes aquecidos, em local escuro e silencioso. Filhotes encontrados sozinhos podem ter os pais por perto: observe antes de recolher.' } } },
  { id: 'feridos', tipo: 'sn', texto: 'Algum animal está ferido, debilitado, inconsciente ou com comportamento anormal?',
    orientacao: { sim: { nivel: 'atencao', titulo: 'Reduza o manejo', texto: 'Manipule o mínimo possível e encaminhe para atendimento veterinário. Não ofereça água ou alimento à força.' } } },
  { id: 'crime', tipo: 'sn', texto: 'Há suspeita de crime ambiental?',
    ajuda: 'Ex.: tráfico, caça, maus-tratos, cativeiro ilegal.',
    orientacao: { sim: { nivel: 'atencao', titulo: 'Preserve vestígios', texto: 'Fotografe tudo antes de alterar o local. Registre gaiolas, armadilhas, anilhas, documentos e objetos. Evite manusear objetos sem luvas.' } } },
  { id: 'tiposCrime', tipo: 'multi', texto: 'Qual é o tipo de suspeita?', quando: r => r.crime === 'sim',
    opcoes: [['trafico', 'Tráfico / comércio'], ['caca', 'Caça'], ['maustratos', 'Maus-tratos'], ['cativeiro', 'Cativeiro ilegal'], ['outro', 'Outro']] },
  { id: 'objetos', tipo: 'multi', texto: 'Há objetos ou elementos relacionados à ocorrência?',
    opcoes: [['gaiolas', 'Gaiolas / caixas'], ['armadilhas', 'Armadilhas'], ['armas', 'Armas'], ['anilhas', 'Anilhas / marcações'], ['documentos', 'Documentos'], ['nenhum', 'Nenhum']] },
  { id: 'vetUrgente', tipo: 'sn', texto: 'Há necessidade de atendimento veterinário urgente?',
    ajuda: 'Ex.: sangramento, fratura exposta, dificuldade para respirar, convulsão.',
    orientacao: { sim: { nivel: 'perigo', titulo: 'Atendimento prioritário', texto: 'Encaminhe com prioridade para atendimento veterinário. Transporte em caixa escura, ventilada e com o mínimo de manipulação.' } } }
];

const AMBIENTES = [['residencia', 'Residência'], ['urbana', 'Área urbana'], ['rural', 'Zona rural'], ['rodovia', 'Rodovia / via'], ['mata', 'Mata / área natural'], ['comercio', 'Comércio / feira'], ['agua', 'Rio / lago'], ['outro', 'Outro']];
const MOTIVOS = [['resgate', 'Resgate / animal em risco'], ['invasao', 'Animal em residência ou estabelecimento'], ['ferido', 'Animal ferido ou atropelado'], ['apreensao', 'Apreensão / fiscalização'], ['denuncia', 'Denúncia'], ['entrega', 'Entrega voluntária'], ['morto', 'Animal morto'], ['outro', 'Outro']];

const CONDICOES = [['saudavel', 'Aparentemente saudável'], ['ferido', 'Ferido'], ['sangramento', 'Sangramento'], ['locomocao', 'Dificuldade de locomoção'], ['respiracao', 'Dificuldade para respirar'], ['debilitado', 'Debilitado / magro'], ['inconsciente', 'Inconsciente'], ['comportamento', 'Comportamento anormal'], ['filhotes', 'Filhotes'], ['anilhado', 'Anilhado / marcado'], ['morto', 'Morto']];
const RISCOS_ANIMAL = [['mordida', 'Mordida'], ['bicada', 'Bicada'], ['arranhadura', 'Arranhadura / garras'], ['coice', 'Coice'], ['peconha', 'Envenenamento / peçonha'], ['constricao', 'Constrição'], ['espinhos', 'Espinhos'], ['zoonose', 'Zoonose (ex.: raiva)']];
/* indicadores de bem-estar observados (protocolo, avaliação inicial "f" e registro "f") */
const COMPORTAMENTOS = [['alerta', 'Alerta / reativo ao ambiente'], ['apatia', 'Apatia / prostração'], ['medo', 'Medo intenso / tentativas de fuga'], ['agressividade', 'Agressividade'], ['repetitivo', 'Movimentos repetitivos (estereotipia)']];
const SITUACOES = [['livre', 'Livre'], ['contido', 'Contido'], ['preso', 'Preso'], ['cativeiro', 'Em cativeiro'], ['transporte', 'Em transporte']];

/* Checklist operacional por etapa da ocorrência — Quadro 1 de Dallabrida et al. (2026, em elaboração).
   As chaves dos itens que já existiam na versão anterior foram mantidas (isolada, epi, equip, fotosAntes,
   semForca, separados, caixa, semAlimento, maos) para não perder marcações já gravadas. */
const CHECKLIST_OPERACIONAL = [
  { id: 'avaliacao', titulo: 'Avaliação inicial', etapa: 'manejo', itens: [
    ['distancia', 'Cenário avaliado à distância antes da aproximação'],
    ['quantidade', 'Espécies, quantidade (inclusive animais escondidos) e riscos identificados'],
    ['vinculos', 'Presença de filhotes ou de vínculos com adultos verificada'],
    ['acondAvaliado', 'Condições de acondicionamento avaliadas (ventilação, temperatura, superlotação)'],
    ['sinaisClinicos', 'Sinais clínicos observados (prostração, lesões, dificuldade respiratória); casos graves encaminhados primeiro']] },
  { id: 'seguranca', titulo: 'Segurança da equipe', etapa: 'manejo', itens: [
    ['isolada', 'Área isolada e curiosos afastados'],
    ['epi', 'EPI adequado ao tipo de ocorrência e ao grupo animal'],
    ['funcoes', 'Funções da equipe definidas (contenção, apoio, registro, isolamento)'],
    ['minimo', 'Número mínimo de pessoas, sem ruído e sem movimentação desnecessária'],
    ['rotaFuga', 'Distância segura mantida e rota de fuga planejada']] },
  { id: 'manejo', titulo: 'Manejo e contenção', etapa: 'manejo', itens: [
    ['equip', 'Contenção indireta priorizada (rede, puçá, cambão, gancho, caixa)'],
    ['semForca', 'Manipulação mínima, sem força excessiva e no menor tempo possível'],
    ['estimulos', 'Estímulos visuais, sonoros e de toque reduzidos'],
    ['particularidades', 'Particularidades da espécie respeitadas (respiração, fragilidade, comportamento)'],
    ['semAlimento', 'Água e alimento oferecidos só com orientação'],
    ['maos', 'Mãos lavadas após o manejo']] },
  { id: 'transporte', titulo: 'Transporte', etapa: 'manejo', itens: [
    ['caixa', 'Recipientes adequados à espécie e ao porte, ventilados e travados'],
    ['separados', 'Animais separados por espécie, porte e condição clínica (predadores longe de presas)'],
    ['sol', 'Sem exposição ao sol, ao calor excessivo ou a correntes de ar'],
    ['fixadas', 'Caixas fixadas no veículo para não se deslocarem'],
    ['monitorar', 'Sinais de estresse observados durante o trajeto']] },
  { id: 'registro', titulo: 'Registro da ocorrência', etapa: 'fotos', itens: [
    ['fotosAntes', 'Cenário documentado antes de qualquer intervenção'],
    ['acondRegistrado', 'Forma de acondicionamento e condições ambientais registradas'],
    ['maustratosFoto', 'Sinais de maus-tratos e estado dos animais fotografados'],
    ['semManipularFoto', 'Nenhum animal manipulado apenas para ser fotografado']] },
  { id: 'destinacao', titulo: 'Destinação', etapa: 'encaminhamento', itens: [
    ['semSoltura', 'Nenhuma soltura imediata sem avaliação técnica'],
    ['habilitada', 'Destino em instituição habilitada (CETAS, CETRAS ou órgão ambiental)'],
    ['comunicado', 'Instituição de destino avisada antes do transporte'],
    ['registroEnc', 'Encaminhamento registrado por completo (origem, condições e destino)']] }
];
const ITENS_CHECKLIST = CHECKLIST_OPERACIONAL.reduce((todos, c) => todos.concat(c.itens), []);

/* Equipamentos de proteção individual recomendados pelo protocolo (seção 4.3) */
const EPI_RECOMENDADOS = [
  ['Luvas de couro ou raspa', 'Mamíferos e aves com risco de mordida, bicada ou arranhadura.'],
  ['Luvas de nitrilo descartáveis', 'Risco biológico (fezes, sangue, carcaças). Podem ser usadas sob ou sobre as luvas de proteção.'],
  ['Botas de cano alto ou perneiras', 'Áreas com possível presença de serpentes.'],
  ['Óculos de proteção ou viseira', 'Risco de respingo de secreções ou de ataque ao rosto (aves de bico longo).'],
  ['Máscara P2 ou equivalente', 'Ambientes com poeira orgânica, fezes acumuladas, amônia ou risco de agentes infecciosos.']
];

/* Sinais observados nas verificações durante o transporte */
const SINAIS_TRANSPORTE = [['estavel', 'Estável'], ['agitacao', 'Agitação intensa'], ['prostracao', 'Prostração'], ['respiracao', 'Dificuldade respiratória'], ['hipertermia', 'Calor excessivo (hipertermia)'], ['obito', 'Óbito']];
const SINAIS_TRANSPORTE_GRAVES = ['prostracao', 'respiracao', 'hipertermia', 'obito'];

const ACONDICIONAMENTOS = [['caixa', 'Caixa de transporte'], ['gaiolaOrig', 'Gaiola original'], ['caixaPlastica', 'Caixa plástica com tampa travada'], ['caixaRigida', 'Caixa rígida vedada (animal perigoso)'], ['saco', 'Saco de pano'], ['frasco', 'Frasco / pote fechado'], ['naoNecessario', 'Não foi necessário'], ['outro', 'Outro']];
const DESTINOS = [['instituicao', 'Entregue a instituição'], ['soltura', 'Soltura no local'], ['permaneceu', 'Permaneceu no local'], ['obito', 'Óbito / carcaça recolhida'], ['outro', 'Outro']];

/* Contatos e instituições cadastrados de fábrica (o usuário pode editar e acrescentar).
   logo = arquivo em recursos/logos (CETRAS usa o logo da UNICENTRO, à qual é vinculado) */
const CONTATOS_PADRAO = [
  { id: 'c190', logo: 'pmpr', nome: 'Polícia Militar', tipo: 'emergencia', telefone: '190', atende24h: true, cidade: 'Nacional', grupos: [], descricao: 'Emergência policial.' },
  { id: 'c193', logo: 'cbmpr', nome: 'Corpo de Bombeiros', tipo: 'emergencia', telefone: '193', atende24h: true, cidade: 'Nacional', grupos: [], descricao: 'Emergência, resgate e salvamento.' },
  { id: 'c192', logo: 'samu', nome: 'SAMU', tipo: 'emergencia', telefone: '192', atende24h: true, cidade: 'Nacional', grupos: [], descricao: 'Atendimento médico de urgência (acidentes com animais peçonhentos).' },
  { id: 'ciatox-pr', logo: 'sus', nome: 'CIATox/Paraná — Centro de Informação e Assistência Toxicológica', tipo: 'emergencia', telefone: '0800 041 0148', atende24h: true, cidade: 'Paraná', grupos: [],
    descricao: 'Orientação 24 h sobre intoxicações e acidentes com animais peçonhentos no Paraná.' },
  { id: 'cintox', logo: 'anvisa', nome: 'Disque-Intoxicação (Anvisa)', tipo: 'emergencia', telefone: '0800 722 6001', cidade: 'Nacional', grupos: [],
    descricao: 'Linha nacional da Anvisa. No Paraná, ligue de preferência para o CIATox/Paraná.' },
  { id: 'ibama', logo: 'ibama', nome: 'IBAMA — Linha Verde', tipo: 'orgao', telefone: '0800 061 8080', cidade: 'Nacional', grupos: [], descricao: 'Denúncias de crimes ambientais.' },
  { id: 'cetras-unicentro', logo: 'unicentro', nome: 'CETRAS — UNICENTRO', tipo: 'cetras', telefone: '(42) 3629-8100', cidade: 'Guarapuava - PR', lat: -25.3935, lng: -51.4562,
    endereco: 'Campus Cedeteg — Alameda Élio Antonio Dalla Vecchia, 838, Guarapuava - PR, CEP 85040-167',
    grupos: ['aves', 'mamiferos', 'repteis', 'anfibios'], descricao: 'Centro de Triagem e Reabilitação de Animais Silvestres, vinculado ao Departamento de Medicina Veterinária (DEVET). Recebe animais de resgates e apreensões de Guarapuava e região. O telefone é o da central do Campus Cedeteg.' },
  { id: 'forca-verde', logo: 'pmpr', nome: 'Polícia Ambiental — Força Verde', tipo: 'orgao', telefone: '', cidade: 'Paraná', grupos: ['aves', 'mamiferos', 'repteis', 'anfibios', 'outros'],
    descricao: 'Batalhão de Polícia Ambiental do Paraná. Apoio em ocorrências e apreensões. Toque para cadastrar o telefone da unidade da sua região.' },
  { id: 'iat', logo: 'iat', nome: 'Instituto Água e Terra (IAT)', tipo: 'orgao', telefone: '', cidade: 'Paraná', grupos: ['aves', 'mamiferos', 'repteis', 'anfibios'],
    descricao: 'Órgão ambiental estadual. Orientação sobre destinação de fauna. Toque para cadastrar o telefone do escritório regional.' },
  { id: 'vig-saude', logo: 'sus', nome: 'Vigilância em Saúde do município', tipo: 'saude', telefone: '', cidade: 'Municipal', grupos: ['mamiferos', 'outros'],
    descricao: 'Notificação de morcegos, primatas mortos e acidentes com risco de zoonose. Toque para cadastrar o telefone do seu município.' }
];

const TIPOS_CONTATO = { emergencia: 'Emergência', cetras: 'CETRAS / triagem', zoo: 'Zoológico', santuario: 'Santuário', orgao: 'Órgão público', saude: 'Saúde', vet: 'Clínica veterinária', outro: 'Outro' };
