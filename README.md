# NORNA

A NORNA é um projeto pessoal que criei para organizar minha jornada profissional em um só lugar.

A ideia é reunir:
- perfil profissional;
- currículo;
- competências;
- cursos;
- jornada de estudos;
- vagas;
- faculdades, pós, extensões e cursos;
- recomendações com base no perfil da pessoa.

O objetivo é que a pessoa não precise procurar tudo separadamente. A NORNA usa as informações cadastradas para comparar oportunidades e mostrar o que combina mais com o perfil.

## Tecnologias

Frontend:
- HTML
- CSS
- JavaScript

Backend:
- Python
- servidor HTTP em Python
- PostgreSQL em produção
- SQLite como fallback local

Bibliotecas e integrações:
- psycopg
- pypdf
- python-docx
- PDF.js
- Mammoth.js
- Remotive API
- Arbeitnow API
- Jooble Brasil API opcional para vagas brasileiras
- Serper API opcional para busca web em tempo real
- OpenAI API opcional para a área NORNA IA

## Como funciona

Cada pessoa cria uma conta e os dados ficam separados por usuário.

Depois do login é possível preencher o perfil, importar currículo, cadastrar competências e cursos, organizar a jornada e pesquisar vagas e formações.

As vagas podem vir de fontes públicas como Remotive e Arbeitnow.

Quando a variável `SERPER_API_KEY` está configurada no Render, a NORNA também faz uma pesquisa web em tempo real e mostra os resultados dentro da própria plataforma. O site externo só é aberto quando a pessoa escolhe uma oportunidade.

## Aplicativo Android

A versão Android é distribuída em APK.

Ao abrir o aplicativo, a pessoa vai direto para login/cadastro. A landing page pública não aparece dentro do app.

O aplicativo usa o mesmo backend e a mesma conta da versão web.

## Variáveis de ambiente

No Render:

```
DATABASE_URL=
COOKIE_SECURE=1
DEV_MODE=1
APP_BASE_URL=https://norna-staging.onrender.com
SERPER_API_KEY=
JOOBLE_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=
```

`SERPER_API_KEY` é usada para pesquisa web em tempo real.\n\n`JOOBLE_API_KEY` ativa uma fonte específica de vagas brasileiras.

`OPENAI_API_KEY` é opcional e ativa a área de IA da NORNA.

## Sobre o desenvolvimento

Este é um projeto autoral criado a partir de uma necessidade que eu mesma identifiquei durante minha transição para tecnologia e dados.

Eu defini a ideia, os requisitos, os fluxos, o visual, as telas, os testes e fui revisando o funcionamento de cada parte durante o desenvolvimento.

Usei inteligência artificial como apoio técnico durante o projeto, principalmente em partes que ainda estou estudando, como backend, autenticação, integração com APIs, banco de dados, depuração e organização de código.

A proposta do projeto também é aprender: por isso mantive HTML, CSS e JavaScript sem framework no frontend e fui acompanhando o funcionamento de cada recurso que foi implementado.

## Autoria

Feito por Camila Monteiro — 2026.
