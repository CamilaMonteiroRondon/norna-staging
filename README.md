# NORNA — Ambiente de teste unificado

Durante o desenvolvimento, use somente `TESTAR_NORNA.bat`.
Ele inicia o backend e abre `http://127.0.0.1:8000`.

No modo local (`DEV_MODE=1`):
- não há dependência de e-mail real para cadastrar;
- a conta é confirmada automaticamente;
- o navegador recebe `no-cache`, evitando CSS antigo;
- o Service Worker/PWA não é registrado em localhost, evitando diferenças por cache.

Em produção, o site e o PWA usam a mesma base visual. O PWA abre `acesso.html?mode=login` por configuração do `manifest.webmanifest`.

# NORNA — versão refinada

## Como abrir corretamente
Não abra `index.html` dando dois cliques no arquivo.

No Windows, execute:

`INICIAR_NORNA.bat`

Ele abre a NORNA em `http://127.0.0.1:8000` e mantém login, cadastro, recuperação de senha e demais funções conectados ao backend.

## Ajustes desta versão
- página inicial mais limpa;
- título em duas linhas, sem palavras empilhadas;
- removido o NORNA que ficava solto no lado direito;
- removida a faixa 01–05 da página inicial;
- somente linhas/fios animados no fundo inteiro, sem bolinhas;
- Login e Cadastro agora abrem em `acesso.html`;
- Sobre e Como funciona continuam em páginas próprias;
- PWA/aplicativo abre direto no acesso;
- recuperação de senha continua disponível;
- funções internas da NORNA foram preservadas.
