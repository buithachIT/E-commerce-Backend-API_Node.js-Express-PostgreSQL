# Deploy & CI/CD — api-ecommerce.nasbui.site
# Stack: Cloudflare + Nginx Proxy Manager (NPM) + Docker Compose

## Architecture

```
GitHub push (main)
    │
    ├─► CI: syntax check + docker build
    │
    └─► CD: SSH → VPS → git pull → docker compose up --build
              │
              └─► Nginx Proxy Manager (:80/:443)
                    → ecommerce-api:3055
                    ▲
Cloudflare DNS/SSL ─┘  api-ecommerce.nasbui.site
```

> This project uses **NPM**, not host Nginx. Port 80/443 belong to NPM.

---

## Part A — Cloudflare DNS

1. DNS → A record:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `api-ecommerce` | `<VPS_PUBLIC_IP>` | Proxied (orange) OK |

2. SSL/TLS → **Full (strict)** (origin cert from NPM Let’s Encrypt)

3. Optional: Always Use HTTPS = On

> First SSL request from NPM: if challenge fails, set record to **DNS only** temporarily, get cert, then Proxied again.

---

## Part B — VPS app (one-time)

### 1. App directory

```bash
cd /opt/api-ecommerce   # or your path
# git clone / pull already done
```

### 2. `.env.production`

```bash
nano .env.production
```

```env
NODE_ENV=production
PORT=3055
APP_URL=https://api-ecommerce.nasbui.site

PROD_DB_HOST=postgres
PROD_DB_PORT=5432
PROD_DB_USER=ecommerce
PROD_DB_PASSWORD=<STRONG_PASSWORD>
PROD_DB_NAME=ecommerce

# Docker network name of Nginx Proxy Manager (see below)
NPM_NETWORK=nginxproxymanager_default
```

Find NPM network name:

```bash
docker network ls | grep -iE 'proxy|npm'
```

Common names: `nginxproxymanager_default`, `npm_default`, `proxy`.  
Set `NPM_NETWORK=...` exactly as listed.

### 3. Start API + Postgres

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
curl http://127.0.0.1:3055/health
# expect: {"status":"ok"}
```

If error `network ... not found`:

```bash
docker network ls
# fix NPM_NETWORK in .env.production, then up again
```

### 4. Disable host Nginx (avoid fighting NPM for :80)

```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
```

---

## Part C — Nginx Proxy Manager UI

Open NPM: `http://<VPS_IP>:81`

**Hosts → Proxy Hosts → Add Proxy Host**

### Details

| Field | Value |
|--------|--------|
| Domain Names | `api-ecommerce.nasbui.site` |
| Scheme | `http` |
| Forward Hostname / IP | `ecommerce-api` |
| Forward Port | `3055` |
| Block Common Exploits | On |
| Websockets Support | On |

> Forward hostname = Docker **container name** `ecommerce-api` (same Docker network as NPM).

If `ecommerce-api` does not resolve inside NPM, either:
- Confirm API joined NPM network: `docker network inspect <NPM_NETWORK>`
- Or use host gateway IP (e.g. `172.17.0.1`) + port `3055` (only if API publishes that port on the host)

### SSL tab

- SSL Certificate → **Request a new SSL Certificate**
- Agree to Let’s Encrypt TOS
- Force SSL = On
- HTTP/2 = On

Save.

### Cloudflare

SSL mode **Full (strict)** + Proxied.

### Test

```bash
curl http://127.0.0.1:3055/health
# Browser / curl after CF:
curl -I https://api-ecommerce.nasbui.site/health
```

Open: https://api-ecommerce.nasbui.site/api-docs

---

## Part D — GitHub Secrets (CI/CD)

| Secret | Value |
|--------|--------|
| `VPS_HOST` | VPS IP |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | Private deploy key |
| `VPS_PORT` | `22` (optional) |
| `VPS_APP_PATH` | `/opt/api-ecommerce` |

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 81/tcp   # NPM admin (prefer restrict to your IP)
sudo ufw enable
# Do not expose 5432. 3055 is localhost-only in compose.
```

Update `deploy.yml` / `deploy.sh` to use:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

---

## Verify

```bash
curl http://127.0.0.1:3055/health
# https://api-ecommerce.nasbui.site/health
# https://api-ecommerce.nasbui.site/api-docs
```

Swagger → Authorize → `x-api-key` from `api_keys` table.

---

## Checklist

- [ ] Cloudflare A record `api-ecommerce`
- [ ] `.env.production` + `NPM_NETWORK` correct
- [ ] `docker compose ... up -d --build` + local `/health` OK
- [ ] Host nginx disabled
- [ ] NPM Proxy Host → `ecommerce-api:3055` + SSL
- [ ] Cloudflare Full (strict)
- [ ] GitHub Secrets + push `main`

---

## URLs

| Resource | URL |
|----------|-----|
| Health | https://api-ecommerce.nasbui.site/health |
| Swagger | https://api-ecommerce.nasbui.site/api-docs |
| API | https://api-ecommerce.nasbui.site/v1/api |
| NPM admin | http://`<VPS_IP>`:81 |

---

## Optional: host Nginx configs

Files under `deploy/nginx/` are **legacy**. Prefer NPM. Only use host Nginx if you stop NPM and free ports 80/443.
