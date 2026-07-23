# Deploy & CI/CD — api-ecommerce.nasbui.site (Cloudflare + VPS)

## Architecture

```
GitHub push (main)
    │
    ├─► CI: syntax check + docker build
    │
    └─► CD: SSH → VPS → git pull → docker compose up --build
              │
              └─► Nginx → API :3055
                    ▲
Cloudflare DNS/SSL ─┘  (api-ecommerce.nasbui.site)
```

---

## Part A — Cloudflare DNS

1. Cloudflare → domain `nasbui.site` → **DNS**
2. Add record:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `api-ecommerce` | `<VPS_PUBLIC_IP>` | Proxied (orange cloud) OK |

3. **SSL/TLS** → Overview → mode **Full (strict)**  
   (Origin has Let's Encrypt cert from Certbot)

4. Optional: **SSL/TLS** → Edge Certificates → Always Use HTTPS = On

> First-time Certbot HTTP challenge: temporarily set proxy to **DNS only** (grey cloud), get cert, then turn orange cloud back on.  
> Or use Cloudflare Origin Certificate (advanced).

Check DNS:

```bash
dig +short api-ecommerce.nasbui.site
# should show Cloudflare IPs if proxied, or your VPS IP if DNS-only
```

---

## Part B — VPS one-time setup

### 1. Install Docker + Nginx + Certbot

```bash
sudo apt update && sudo apt install -y ca-certificates curl nginx git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# re-login
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Deploy key for GitHub Actions (on VPS)

```bash
# Create deploy user (recommended) or use your user
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Copy PRIVATE key to GitHub Secrets (VPS_SSH_KEY) — keep it secret
cat ~/.ssh/github_actions_deploy
```

### 3. Clone app once

```bash
sudo mkdir -p /opt/ecommerce-api
sudo chown $USER:$USER /opt/ecommerce-api
cd /opt/ecommerce-api
git clone <YOUR_GITHUB_REPO_URL> .
```

### 4. Production `.env` (never commit)

```bash
cp .env.example .env
nano .env
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
```

### 5. First start

```bash
docker compose -f docker-compose.prod.yml up -d --build
curl http://127.0.0.1:3055/health
```

### 6. Nginx

```bash
sudo cp deploy/nginx/api-ecommerce.nasbui.site.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/api-ecommerce.nasbui.site.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 7. SSL (origin)

If Cloudflare is **DNS only** for the first cert:

```bash
sudo certbot --nginx -d api-ecommerce.nasbui.site
```

Then turn **Proxied** back on in Cloudflare, SSL mode **Full (strict)**.

---

## Part C — GitHub Secrets (CI/CD)

Repo → **Settings** → **Secrets and variables** → **Actions** → New repository secret:

| Secret | Value |
|--------|--------|
| `VPS_HOST` | VPS public IP (or hostname) |
| `VPS_USER` | SSH user (e.g. `ubuntu` / `root` / deploy user) |
| `VPS_SSH_KEY` | Full private key content (`-----BEGIN OPENSSH PRIVATE KEY-----` …) |
| `VPS_PORT` | `22` (optional, default 22) |
| `VPS_APP_PATH` | `/opt/ecommerce-api` |

### Firewall on VPS

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
# Do NOT open 3055 or 5432 to the world
```

---

## Part D — How CI/CD works

Workflows in `.github/workflows/`:

| Workflow | When | What |
|----------|------|------|
| `ci.yml` | push / PR | `node --check` + `docker build` |
| `deploy.yml` | push `main` / manual | SSH → `git pull` → `docker compose up -d --build` → health check |

### Flow after setup

1. Push code to `main`
2. CI runs (green = syntax + image build OK)
3. Deploy runs → VPS updates automatically
4. Check: https://api-ecommerce.nasbui.site/health

### Manual deploy (without waiting for GitHub)

On VPS:

```bash
bash deploy/scripts/deploy.sh
# or
APP_DIR=/opt/ecommerce-api BRANCH=main bash deploy/scripts/deploy.sh
```

Or GitHub → Actions → **Deploy production** → Run workflow.

---

## Verify production

```bash
curl https://api-ecommerce.nasbui.site/health
curl https://api-ecommerce.nasbui.site/api-docs
```

Swagger Authorize → `x-api-key` from DB `api_keys` table.

---

## Checklist

- [ ] Cloudflare A record `api-ecommerce` → VPS IP
- [ ] SSL mode Full (strict)
- [ ] VPS Docker + Nginx + first `docker compose` up
- [ ] Certbot origin cert
- [ ] GitHub Secrets set (`VPS_*`)
- [ ] Push to `main` → Actions green → `/health` OK

---

## URLs

| Resource | URL |
|----------|-----|
| Health | https://api-ecommerce.nasbui.site/health |
| Swagger | https://api-ecommerce.nasbui.site/api-docs |
| API base | https://api-ecommerce.nasbui.site/v1/api |
