# Deploy da NORNA

## Para portfólio

Hospede o backend Python em um serviço que permita processo web persistente e disco/banco durável. Em produção, substitua SQLite por PostgreSQL/Supabase antes de abrir para muitos usuários.

Configure no serviço:

- `APP_BASE_URL=https://seu-dominio`
- `DEV_MODE=0`
- `COOKIE_SECURE=1`
- SMTP para confirmação/recuperação de e-mail
- `OPENAI_API_KEY` somente se quiser habilitar a camada de IA

Nunca publique senhas, chave SMTP ou chave de IA no GitHub.

## Próximo passo recomendado para produção real

O MVP usa SQLite para deixar o projeto executável sem depender de serviços externos. Para uso público com várias pessoas, a evolução natural é PostgreSQL/Supabase, mantendo os mesmos conceitos de usuário, sessão e dados privados.
