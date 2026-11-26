# Produção: guia de operação

Servidor do piloto: o servidor próprio do dono (Oracle Cloud, **ARM64**, 2 vCPU, 12 GB, 45 GB de disco), **compartilhado com outros projetos**, em `/opt/consultorio-aberto`. Tudo roda por `docker-compose.prod.yml` (projeto Compose `consultorio-aberto`): `postgres`, `backup`, `migrate` (executa uma vez), `api`, `worker`, `edge` (Caddy em HTTP, só na rede interna) e `cloudflared` (conector do Cloudflare Tunnel). **Nenhuma porta é publicada no host**: o tráfego público entra pela Cloudflare (TLS termina lá), segue pelo túnel até `http://edge:80`, e o `edge` serve o painel e o site e repassa a API. O Postgres não publica porta (RN-14).

Convenção deste texto: `PAINEL` é `app.consultorioaberto.com.br` (painel e API, sob `/api` e `/webhooks`) e `SITE` é `consultorioaberto.com.br` (`www.` redireciona para ele).

Servidor compartilhado: não mexa nos contêineres, portas, `/etc/cloudflared` nem nos arquivos dos outros projetos, e não reinicie o Docker. O deploy remove só as imagens antigas deste projeto e guarda o login do GHCR em `/opt/consultorio-aberto/.docker` (nunca no `~/.docker` do usuário).

Limites de memória (`mem_limit`): postgres 1 GB (`shared_buffers` 256 MB, `work_mem` 16 MB, 50 conexões), worker 768 MB, api 512 MB, migrate 512 MB, backup 256 MB, cloudflared 128 MB, edge 64 MB.

## 1. Antes do primeiro deploy

1. Servidor: Linux com Docker Engine e o plugin Compose, disco cifrado pelo provedor e atualizações automáticas (RN-14, RN-15). Este projeto não precisa de porta aberta no firewall.
2. Cloudflare: a zona `consultorioaberto.com.br` ativa (nameservers da Cloudflare no Registro.br) e um túnel **gerenciado remotamente** (Zero Trust > Networks > Tunnels), aqui `consultorio-aberto`, com estas rotas de hostname público, todas para o serviço `http://edge:80`:
   - `consultorioaberto.com.br`, `www.consultorioaberto.com.br` e `app.consultorioaberto.com.br`.
   - A Cloudflare cria os CNAMEs (com proxy) para `<id do túnel>.cfargotunnel.com`.
   - O token do túnel (o valor depois de `--token` no comando de instalação) vai em `.env.tunnel` como `TUNNEL_TOKEN=...`.
3. Resend: domínio verificado (registros DNS na Cloudflare), região São Paulo; chave de API com permissão só de envio em `RESEND_API_KEY`. O remetente é `Consultório Aberto <nao-responda@consultorioaberto.com.br>` (`EMAIL_FROM`).
4. R2 (Cloudflare): crie um bucket **privado** só para backup (nome em `PGBACKREST_REPO1_S3_BUCKET`) e um token de API do R2 com leitura e escrita nesse bucket apenas. Endpoint: `<id da conta>.r2.cloudflarestorage.com`.
5. Guarde a senha de cifra dos backups (`PGBACKREST_REPO1_CIPHER_PASS`) **fora do servidor** (gerenciador de senhas). Sem ela nenhum backup abre (RN-11).
6. Crie as contas pendentes da E-26 se quiser: Sentry, Axiom, Langfuse (variáveis na seção 3).

## 2. Primeiro deploy

Com `NODE_ENV=production`, a API e o worker se recusam a subir sem `RESEND_API_KEY`.

No servidor, em `/opt/consultorio-aberto` (ou `DEPLOY_PATH`):

```bash
sudo mkdir -p /opt/consultorio-aberto && sudo chown "$USER" /opt/consultorio-aberto && cd /opt/consultorio-aberto
# traga docker-compose.prod.yml (o deploy automático também copia; na primeira vez, scp)
cp .env.example .env        # preencha conforme a seção 3
cp .env.db.example .env.db  # senhas do banco e do R2
printf 'TUNNEL_TOKEN=%s\n' '<token do túnel>' > .env.tunnel
chmod 600 .env .env.db .env.tunnel
export DOCKER_CONFIG=$PWD/.docker              # login do GHCR só deste projeto
docker compose -f docker-compose.prod.yml pull   # imagens arm64 do GHCR (IMAGE_PREFIX, IMAGE_TAG)
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps     # tudo "healthy"; migrate "exited (0)"
```

As imagens são públicas no GHCR (`ghcr.io/<dono>/<repo>/{api,worker,edge,postgres}`): contêm só o código e os valores públicos `VITE_*`/`PUBLIC_*` (o `.dockerignore` exclui todos os `.env`). Se ficarem privadas, faça `docker login ghcr.io` com um token `read:packages`, sempre com o `DOCKER_CONFIG` acima.

Ordem que o Compose segue: `postgres` saudável, depois `migrate` (`pnpm db:migrate`: aplica as migrations SQL e cria as filas do pg-boss), depois `api` e `worker`, depois `edge`, depois `cloudflared`. O serviço `backup` cria o stanza, confere o arquivamento e tira o primeiro backup completo na hora.

Conferência:

```bash
curl -fsS https://PAINEL/health && curl -fsS https://PAINEL/ready && curl -fsSI https://SITE
docker stats --no-stream $(docker compose -f docker-compose.prod.yml ps -q)   # memória contra os limites
docker compose -f docker-compose.prod.yml exec backup pgbackrest info     # deve listar "full backup"
docker compose -f docker-compose.prod.yml exec backup /usr/local/bin/wal-health.sh && echo WAL ok
```

Crie o convite do primeiro cliente (cadastro é só por convite): `pnpm invite` num ambiente com acesso ao banco, ou pelo painel do operador (`OPERATOR_EMAILS`).

## 3. Variáveis

`.env` (api, worker, migrate e variáveis do Compose). Modelo: `.env.example`.

| Variável | Valor em produção |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgres://app_runtime:<APP_RUNTIME_PASSWORD>@postgres:5432/app` |
| `MIGRATION_DATABASE_URL` | `postgres://app_migrator:<APP_MIGRATOR_PASSWORD>@postgres:5432/app` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://PAINEL` (a API fica sob `/api` do painel) |
| `RESEND_API_KEY` | chave da Resend (obrigatória em produção) |
| `WEB_ORIGIN` | `https://PAINEL` |
| `SITE_ORIGIN` | `https://SITE` |
| `PUBLIC_API_URL` | `https://PAINEL` (embutida no site no build; o formulário da lista de espera chama `/api/waitlist`) |
| `TURNSTILE_SECRET_KEY`, `PUBLIC_TURNSTILE_SITE_KEY` | chaves reais do Cloudflare Turnstile (não as de teste) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_KEY` | cliente OAuth do Google; `openssl rand -base64 32` |
| `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_ACCESS_TOKEN` | do aplicativo Meta; token aleatório longo; token do usuário de sistema |
| `META_APP_ID`, `META_ES_CONFIG_ID`, `META_TOKEN_KEY` | Embedded Signup; `openssl rand -base64 32` |
| `WAHA_URL` | `http://waha:3000` (rede privada; sem ela e sem a chave, a conexão por QR code fica desligada) |
| `WAHA_API_KEY`, `WAHA_WEBHOOK_SECRET` | `openssl rand -hex 32` cada; o Compose passa as duas ao contêiner `waha` (chave da API e HMAC dos webhooks) |
| `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY`, `PUSH_SUBJECT` | obrigatórias em produção (gerar uma vez) |
| `VERCEL_API_KEY`, `TYPESAFE_API_KEY` | IA (`AI_DEV_PROVIDER` e `GROQ_API_KEY` **ausentes**: a linha vazia falha na validação) |
| `LANGFUSE_*`, `SENTRY_DSN`, `VITE_SENTRY_DSN`, `AXIOM_TOKEN`, `AXIOM_DATASET` | opcionais; cada um liga sozinho |
| `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_WEBHOOK_TOKEN` | chave de produção; `https://api.asaas.com/v3`; `openssl rand -hex 24` |
| `OPERATOR_EMAILS` | e-mails dos operadores |
| `PANEL_DOMAIN`, `SITE_DOMAIN` | `app.consultorioaberto.com.br`, `consultorioaberto.com.br` |
| `IMAGE_PREFIX`, `IMAGE_TAG` | preenchidos pelo deploy automático |

`.env.db` (postgres e backup): senhas do banco (`POSTGRES_PASSWORD`, `APP_MIGRATOR_PASSWORD`, `APP_RUNTIME_PASSWORD`, em hexadecimal porque entram em URL) e `PGBACKREST_REPO1_*` do R2. Os papéis do banco só são criados na primeira inicialização do volume: trocar essas senhas depois exige `alter role` (seção 7).

`.env.tunnel` (só o `cloudflared`): `TUNNEL_TOKEN`.

Os valores de `VITE_*` e `PUBLIC_*` são lidos no **build** da imagem `edge` (variáveis do repositório no GitHub): mudou um, refaça a imagem.

## 4. Endereços para configurar nos provedores

| Onde | Valor |
|---|---|
| Meta, webhook do WhatsApp (URL de retorno) | `https://PAINEL/webhooks/whatsapp`, token de verificação igual a `META_VERIFY_TOKEN` |
| Meta, campos assinados | `messages`, `account_update`, `history`, `smb_app_state_sync`, `smb_message_echoes` |
| Meta, domínios do Embedded Signup | `PAINEL` nos domínios permitidos do Facebook Login |
| Asaas, webhook | `https://PAINEL/webhooks/asaas`, "Token de autenticação" igual a `ASAAS_WEBHOOK_TOKEN` |
| Google, URIs de redirecionamento autorizados | `https://PAINEL/api/auth/callback/google` e `https://PAINEL/api/calendar/google/callback` |
| Google, origem JavaScript autorizada | `https://PAINEL` |
| Turnstile | domínio `SITE` |
| WAHA (conexão por QR code) | nada a configurar fora: o contêiner chama `http://api:3000/webhooks/waha` na rede privada |

O WhatsApp aceita o webhook só depois que `https://PAINEL` responde: a zona da Cloudflare precisa estar ativa e o túnel conectado.

## 5. Deploy automático

`.github/workflows/deploy.yml` roda depois do CI verde na `main`: constrói as imagens `linux/arm64` (api, worker, edge, postgres) no runner `ubuntu-24.04-arm` e publica no GHCR, sempre. O passo seguinte acessa o servidor por SSH para `pull` e `up -d` (o serviço `migrate` roda a cada deploy) e fica **desligado** até existirem os segredos do repositório:

- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY` (chave privada SSH de um usuário no grupo `docker`; num servidor compartilhado, prefira uma chave só para isto).
- Opcionais: `DEPLOY_KNOWN_HOSTS` (saída de `ssh-keyscan HOST`, conferida por você; sem ele o fluxo confia na primeira conexão), variável `DEPLOY_PATH` (padrão `/opt/consultorio-aberto`), variáveis públicas do build (`VITE_HELP_URL`, `VITE_SENTRY_DSN`, `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_API_URL=https://app.consultorioaberto.com.br`).

Sem os segredos, o deploy é manual: no servidor, `IMAGE_TAG=<sha>` no `.env`, `pull` e `up -d` como na seção 2.
- Crie o ambiente `production` no GitHub (pode exigir aprovação manual).

Reverter: no servidor, `IMAGE_TAG=<sha anterior>` no `.env` e `docker compose -f docker-compose.prod.yml up -d`. Migrations são só de ida: escreva-as compatíveis com a versão anterior.

## 6. Backups e restauração (RN-10 a RN-16)

O que existe: pgBackRest (versão fixada na imagem) arquiva cada WAL no R2 (`archive_timeout` de 5 minutos), faz backup completo aos domingos e diferencial nos outros dias (às 06:00 UTC), mantém 4 completos (cerca de 28 dias de recuperação em ponto no tempo) e 7 diferenciais. Tudo cifrado com AES-256 antes de sair do servidor. Escolhemos pgBackRest em vez de WAL-G porque traz completo, diferencial, retenção e restauração em ponto no tempo no mesmo comando, e a verificação do arquivo (`check`).

**Alerta de WAL atrasado (RN-13):** o healthcheck do serviço `backup` (`wal-health.sh`) fica `unhealthy` se o último WAL arquivado tiver mais de 15 minutos. Aponte um monitor externo para isso (por exemplo um cron que testa `docker inspect -f '{{.State.Health.Status}}'` e chama um serviço de ping). Alerta de disco e de conexões (RN-15): use o monitor do provedor ou `node_exporter`; ainda por fazer.

**Ensaio de restauração (todo mês, RN-12).** Num servidor descartável, ou no próprio servidor (o script usa um contêiner e um volume temporários, sem porta, e apaga tudo no fim):

```bash
# 1. contagens de hoje, para comparar (antes do ponto escolhido)
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d app -At -f - < scripts/row-counts.sql > contagens.txt
# 2. restaurar para um ponto (ou --latest) e comparar
scripts/restore-pitr.sh --env-file .env.db --image <IMAGE_PREFIX>/postgres:<IMAGE_TAG> \
  --target '2027-01-31 14:30:00+00' --expect-counts contagens.txt
```

Sem `--expect-counts` o script exige só que `_prisma_migrations` não esteja vazia e imprime a contagem por tabela. A saída termina em `OK: restored ...`. Se falhar, trate como incidente: backup sem restauração testada não conta.

Teste local completo, sem nuvem (MinIO em contêiner, dados fictícios): `docker build -t consultorio/postgres:local docker/postgres && scripts/test-backup-drill.sh`.

**Recuperação total, servidor perdido (meta de 2 horas, RN-16):**

1. Suba um servidor novo (seção 1) e instale Docker. O DNS não muda: o túnel conecta de onde o `cloudflared` rodar (traga `.env.tunnel`).
2. Traga `.env`, `.env.db`, `.env.tunnel` (do gerenciador de senhas, com a **mesma** senha de cifra) e o compose.
3. Restaure o volume: `docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint sh backup -c 'true'` cria os volumes; então, com o Postgres parado, rode como `postgres` no volume `pgdata`: `pgbackrest --stanza=main --type=default restore` (último ponto) ou `--type=time --target=...`. O `restore-pitr.sh` mostra a sequência exata e valida o resultado.
4. `docker compose -f docker-compose.prod.yml up -d`. Se a restauração for em ponto no tempo, o Postgres promove e abre nova linha do tempo; faça `pgbackrest --stanza=main stanza-upgrade` se pedir e tire um backup completo (`docker compose exec backup pgbackrest backup --type=full`).
5. Confira `/ready`, conecte o WhatsApp (os webhooks voltam sozinhos com o DNS) e avise os clientes se houve perda de mensagens.

## 7. Rotação de segredos

Regra geral: troque no `.env` (ou `.env.db`) do servidor e `docker compose -f docker-compose.prod.yml up -d` para recriar os serviços afetados.

| Segredo | Como |
|---|---|
| `BETTER_AUTH_SECRET` | Troca derruba todas as sessões (todos precisam entrar de novo). |
| `META_APP_SECRET`, `META_ACCESS_TOKEN`, `ASAAS_*`, `VERCEL_API_KEY`, `TYPESAFE_API_KEY` | Gere a chave nova no provedor, grave no `.env`, recrie `api` e `worker`, revogue a antiga. Asaas: o token do webhook também muda no painel do Asaas, no mesmo momento. |
| `META_VERIFY_TOKEN` | Mude no `.env` e no painel da Meta ao mesmo tempo. |
| `GOOGLE_TOKEN_KEY`, `META_TOKEN_KEY` | Cifram dados no banco: trocar a chave **invalida** o que já foi gravado (tokens do Google e da Meta de cada cliente; todos reconectam). Só em caso de vazamento. |
| Senhas do banco | `alter role app_runtime password '...'` (e `app_migrator`) como `postgres`: `docker compose exec postgres psql -U postgres -d app`. Depois atualize `.env` e `.env.db` e recrie os serviços. |
| Token do R2 | Crie um novo token, troque em `.env.db`, recrie `postgres` e `backup`, confira `pgbackrest check` e revogue o antigo. |
| `PGBACKREST_REPO1_CIPHER_PASS` | Não dá para trocar num repositório existente. Crie um repositório novo (outro `PGBACKREST_REPO1_PATH` ou bucket), faça um backup completo e só então apague o antigo. |
| `TUNNEL_TOKEN` | No painel do túnel, gere um token novo (ou recrie o conector), troque em `.env.tunnel` e `up -d cloudflared`. |
| `RESEND_API_KEY` | Crie a chave nova na Resend, troque no `.env`, recrie `api` e `worker`, apague a antiga. |
| Chave SSH do deploy | Gere par novo, ponha a pública em `authorized_keys`, atualize `DEPLOY_KEY`, remova a antiga. |

## 8. Dia a dia

- Logs: `docker compose -f docker-compose.prod.yml logs -f api worker` (sem conteúdo de mensagem). Erros recentes: painel do operador.
- Painel do pg-boss: `pg-boss-dashboard` em processo separado, só em localhost, por túnel SSH (E-27).
- Eliminação de contas encerradas (30 dias): rotina diária do worker, descrita na spec 06; o log `tenant deletion done` traz a contagem.
- Limitações conhecidas: um único servidor é ponto único de falha (aceito no piloto, RN-16 cobre a recuperação); o TLS entre `api` e `postgres` não está ativado (rede privada do Compose no mesmo host); entre a Cloudflare e o `edge` o tráfego vai cifrado pelo túnel e só o último salto (`cloudflared` → `edge`, na rede interna) é HTTP; o gateway de WhatsApp (WAHA) ainda não está no compose.

## 9. Conexão por QR code (WAHA)

- Serviço `waha` no `docker-compose.prod.yml`: imagem `devlikeapro/waha:gows-arm-2026.10.1` fixada por digest (o servidor é aarch64; a imagem `gows` sem `-arm` é só amd64), 384 MB, sem porta publicada, sessões no volume `wahasessions`. Core gratuito, sem chave de licença.
- Atualizar a imagem só depois de testar (RF-29b): trocar tag e digest juntos (`docker buildx imagetools inspect devlikeapro/waha:gows-arm-VERSAO`), subir em desenvolvimento com a `gows-VERSAO` amd64, rodar `pnpm vitest run packages/channels` e ler um QR de teste.
- Testar sem celular: `docker compose exec api node -e "fetch('http://waha:3000/api/sessions',{headers:{'x-api-key':process.env.WAHA_API_KEY}}).then(r=>r.text()).then(console.log)"` lista as sessões.
- O volume guarda as credenciais de cada número conectado: não apague. Perder o volume desconecta todos os números por QR (a checagem de 5 minutos avisa cada dono).

