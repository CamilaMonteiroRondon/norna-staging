# NORNA — staging online no Render

Esta pasta já está preparada para um Web Service do Render.

- Runtime: Python
- Start: `python server.py`
- Health check: `/api/health`
- Staging: `DEV_MODE=1`, portanto contas de teste são confirmadas automaticamente.
- Cookies: seguros em HTTPS.
- O servidor usa automaticamente a variável `PORT` do Render e escuta em `0.0.0.0`.

## Observação sobre dados
Enquanto o staging usar SQLite no plano gratuito, os dados servem para teste, mas podem ser perdidos após um novo deploy/recriação da instância. Para persistência real, a próxima etapa é ligar a NORNA a Postgres/Supabase.
