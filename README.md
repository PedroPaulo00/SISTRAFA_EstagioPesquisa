# SISTRAFA

**Aplicação web progressiva para triagem de risco e manejo de fauna silvestre em operações de campo**

O SISTRAFA apoia policiais e bombeiros no atendimento de ocorrências com animais silvestres: resgates em residências e vias, animais feridos ou atropelados, apreensões e entregas voluntárias. O agente responde a perguntas simples, uma por vez, e o aplicativo mostra a orientação de segurança e de manejo adequada a cada resposta, sempre com o motivo. Ao final, gera um relatório em PDF no próprio celular.

O aplicativo funciona sem internet depois do primeiro acesso, e todos os dados ficam somente no aparelho: não há servidor nem conta on-line.

> O SISTRAFA é uma ferramenta auxiliar. Não substitui boletins de ocorrência, documentos oficiais, protocolos da instituição nem a avaliação de profissionais especializados.

Projeto desenvolvido no estágio-pesquisa do curso de Ciência da Computação da Universidade Estadual do Centro-Oeste (UNICENTRO), em Guarapuava (PR).

## Funções

- **Ocorrência em oito etapas:** abertura, avaliação de risco, contexto, fotos do local, animais e lotes, manejo, encaminhamento e revisão. O número da ocorrência, a data, a hora, o responsável e a localização são registrados automaticamente.
- **Triagem por perguntas condicionais**, uma por vez, com as respostas "Sim", "Não" e "Não sei".
- **22 regras de orientação** que combinam as respostas com os animais cadastrados. Cada orientação traz o motivo ("Por quê: Lote 1 (aves) apresenta ferimentos").
- **Checklist operacional** com 29 itens em seis blocos e lista de EPI, baseados no protocolo de atuação policial de Dallabrida *et al.* (2026).
- **Cadastro de animais individuais e de lotes**, por exemplo 30 aves apreendidas numa única ficha, com espécie, estado, condição, comportamento e riscos.
- **Fotografias** com data, hora, autor, localização e metadados Exif. O app calcula o código SHA-256 do arquivo original, faz recortes como cópia e registra exclusões com motivo.
- **Horários do atendimento:** início e conclusão de cada etapa, pausas e retomadas.
- **Recebimento:** nome, função, registro na instituição e CRMV ou documento de quem recebeu os animais.
- **Relatório em PDF** gerado no aparelho, sem internet, para baixar, compartilhar ou imprimir.
- **Guia de fauna** com 29 espécies do Paraná e da Região Sul. As fotos e os dados complementares vêm da API do iNaturalist e podem ser baixados para uso sem internet.
- **Contatos e instituições:** emergência, órgãos ambientais e de saúde e o CETRAS/UNICENTRO, com ligação em um toque.
- **Acessibilidade:** tema claro para luz solar, alto contraste, três tamanhos de texto, alvos de toque grandes e suporte a leitores de tela.

## Como usar

### No navegador

O aplicativo é feito só de arquivos estáticos (HTML, CSS e JavaScript). Para que o funcionamento sem internet (Service Worker) seja ativado, ele precisa ser aberto por um endereço `http://localhost` ou `https://`, e não com dois cliques no `index.html`.

Com o [Node.js](https://nodejs.org) instalado, na pasta do projeto:

```bash
npx http-server -p 8080
```

Depois, abra `http://localhost:8080` no navegador. No celular, o navegador oferece a opção de instalar o app na tela inicial.

O projeto também pode ser publicado em qualquer hospedagem de páginas estáticas, como o GitHub Pages.

### No Android

O instalador está na pasta [`apk/`](apk/). Para instalar, copie o arquivo `.apk` para o celular, abra-o e permita a instalação de apps de fontes desconhecidas quando o Android pedir. Funciona a partir do Android 7.0.

O APK é uma versão de teste, assinada com a chave de depuração do Android. Uma versão nova instala por cima da anterior sem apagar os dados.

## Como compilar o APK

O projeto Android fica em [`android/`](android/). É um invólucro em Java que exibe o mesmo código web num WebView. Na compilação, os arquivos do app são copiados para dentro do pacote.

Requisitos: JDK 21, Android SDK (compileSdk 35) e Gradle 8.14.

```bash
cd android
gradle assembleRelease
```

Os arquivos de compilação ficam fora da pasta do projeto, em `%LOCALAPPDATA%\sistrafa-android\build` no Windows (ou na pasta temporária do sistema, em outros sistemas). O APK gerado fica em `app\outputs\apk\release\` dentro dessa pasta.

O código nativo cuida do que o WebView não faz sozinho: câmera e galeria, permissão de localização, tela cheia na posição vertical, botão Voltar, salvar arquivos na pasta Downloads, compartilhar e imprimir.

## Estrutura

```
index.html              página única do aplicativo
manifest.webmanifest    manifesto da aplicação web progressiva
servico-offline.js      Service Worker (funcionamento sem internet)
css/estilos.css         estilos e temas
js/
  aplicativo.js         rotas, telas e eventos
  ocorrencia.js         etapas da ocorrência, regras de orientação, fotos e relatório em tela
  dados.js              espécies, perguntas, checklist, EPI e contatos
  armazenamento.js      localStorage (ocorrências, perfil, contatos) e IndexedDB (fotos)
  relatorio-pdf.js      relatório em PDF (jsPDF e AutoTable)
  fauna-online.js       consulta à API do iNaturalist e cache
  exif.js               leitura de metadados Exif das fotos
  interface.js          componentes e utilidades de interface
  bibliotecas/          jsPDF e jsPDF-AutoTable
recursos/               logo, ícones, fundo, fontes e logos dos órgãos
android/                projeto Android (invólucro WebView)
apk/                    instalador para Android
artigo/                 artigo do estágio (PDF e Word) e figuras
documentacao/           relatórios do estágio e documento de funcionamento
```

## Tecnologias

- HTML5, CSS3 e JavaScript, sem frameworks
- Service Worker e Cache Storage, para funcionar sem internet
- `localStorage` e IndexedDB, para guardar os dados no aparelho
- Web Crypto API (SHA-256)
- [jsPDF](https://github.com/parallax/jsPDF) e [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable), ambas com licença MIT
- [API do iNaturalist](https://api.inaturalist.org/v1/docs/), para fotos e dados complementares do guia
- Android WebView com WebViewAssetLoader (Java)

## Dados e privacidade

Perfil, ocorrências, fotos e contatos ficam somente no aparelho. A única comunicação externa é a consulta de espécies ao iNaturalist, que não envia dados das ocorrências. O PIN controla o acesso à interface, mas os dados não são criptografados. A cópia de segurança exportada pelo app não inclui as fotos.

## Limitações

- Os testes foram feitos em navegadores no computador (Chrome, Edge e Firefox) e no emulador Android; não houve testes sistemáticos em aparelhos físicos nem no Safari (iOS).
- O conteúdo de manejo ainda não passou por validação sistemática com especialistas.
- A fonte Frutiger, usada na interface e no relatório, é de uso comercial; a licença deve ser verificada antes de uma distribuição pública.
- As fotos do iNaturalist pertencem aos seus autores e são exibidas apenas como referência, com crédito. Os logotipos dos órgãos pertencem às respectivas instituições.

## Equipe

- **Desenvolvimento:** Pedro Paulo de Lima
- **Orientação:** Profa. Dra. Carolina Paula de Almeida (DECOMP/UNICENTRO)
- **Coorientação:** Prof. Dr. Jayme Augusto Peres (UNICENTRO)
- **Conteúdo de manejo:** Me. Vanessa Eloisa Dallabrida (CETRAS/UNICENTRO)

## Artigo

O artigo do estágio descreve o desenvolvimento, os requisitos, a arquitetura e os testes: [`artigo/SISTRAFA_artigo_estagio_Pedro_Paulo_de_Lima.pdf`](artigo/SISTRAFA_artigo_estagio_Pedro_Paulo_de_Lima.pdf).
