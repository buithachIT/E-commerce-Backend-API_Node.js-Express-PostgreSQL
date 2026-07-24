# Hiểu CI/CD trong project này

Tài liệu giải thích **cách GitHub Actions hoạt động** với E-commerce Backend API — từ lúc bạn `git push` đến khi code chạy trên VPS `api-ecommerce.nasbui.site`.

---

## 1. CI/CD là gì? (ý tưởng)

| Thuật ngữ | Nghĩa đơn giản |
|-----------|----------------|
| **CI** (Continuous Integration) | Mỗi lần đẩy code lên GitHub, máy ảo tự **kiểm tra** code có lỗi cú pháp / build Docker được không |
| **CD** (Continuous Deployment) | Nếu ổn, máy ảo tự **SSH vào VPS**, kéo code mới, rebuild container — không cần deploy tay |

Không có “ma thuật”: GitHub thuê một máy Ubuntu tạm (`ubuntu-latest`), chạy đúng các lệnh bạn viết trong file YAML dưới `.github/workflows/`.

```
Máy bạn                GitHub                    VPS
────────               ──────                    ───
git push main  ──►  CI kiểm tra
                    Deploy SSH  ──────────►  git pull
                                             docker compose up --build
                                             curl /health
```

---

## 2. Hai workflow trong repo

| File | Tên trên UI | Việc làm |
|------|-------------|----------|
| `.github/workflows/ci.yml` | **CI** | Check syntax JS + `docker build` |
| `.github/workflows/deploy.yml` | **Deploy production** | SSH VPS → pull → rebuild → health check |

Mở: GitHub repo → tab **Actions**.

---

## 3. Workflow CI — “code này có chạy được không?”

### Khi nào chạy?

```yaml
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
```

- Push lên `main` / `master` → chạy  
- Mở / update Pull Request vào `main` → chạy  

### Các bước (jobs → steps)

1. **Checkout** — clone đúng commit vừa push vào máy ảo GitHub  
2. **Setup Node 20** — cài Node giống môi trường project  
3. **npm install** — cài dependency  
4. **Syntax check** — `node --check` từng file `.js` (bắt lỗi thiếu `}`, import sai cú pháp…)  
5. **Docker build** — thử `docker build -f dockerfile` xem image tạo được không  

CI **không** đụng tới VPS, **không** sửa production. Chỉ trả lời: “commit này có vẻ ổn để deploy không?”

> Hiện CI và Deploy chạy **song song** khi push `main` (Deploy chưa `needs: CI`). Sau này có thể bắt Deploy đợi CI xanh mới chạy.

---

## 4. Workflow Deploy — “đưa code lên production”

### Khi nào chạy?

```yaml
on:
  push:
    branches: [main, master]
  workflow_dispatch:   # bấm Run workflow trên UI
```

### Secrets (bí mật trên GitHub)

Deploy **không** ghi IP / password vào YAML. Nó đọc **Secrets**:

| Secret | Dùng để |
|--------|---------|
| `VPS_HOST` | Địa chỉ SSH (IP VPS) |
| `VPS_USER` | User SSH (`root`, `ubuntu`…) |
| `VPS_SSH_KEY` | Private key để login (không phải file `.pub`) |
| `VPS_APP_PATH` | Thư mục app trên VPS (`/opt/api-ecommerce`) |
| `VPS_PORT` | Port SSH (thường `22`) |

`appleboy/ssh-action` dùng key này để SSH giống bạn gõ:

```bash
ssh -i private_key user@vps
```

Nếu key sai / dán nhầm public key → lỗi `ssh: no key found` / `unable to authenticate`.

### Script chạy **trên VPS** (quan trọng)

Sau khi SSH thành công, các lệnh sau chạy **trên máy VPS**, không phải trên GitHub:

```text
1. cd /opt/api-ecommerce          ← vào đúng folder app
2. git fetch origin               ← lấy commit mới từ GitHub
3. git reset --hard origin/main   ← ép working tree = đúng main trên GitHub
4. docker compose --env-file .env -f docker-compose.prod.yml up -d --build
5. curl http://127.0.0.1:3055/health
```

Giải thích từng ý:

| Lệnh | Ý nghĩa |
|------|---------|
| `git fetch` | Tải object/commit mới về remote `origin` trên VPS |
| `git reset --hard origin/main` | Bỏ thay đổi local trên VPS, khớp 100% với GitHub `main` |
| `docker compose ... --build` | Build lại image API với code vừa kéo, restart container |
| `curl .../health` | Xác nhận process Node trong Docker còn sống |

Log `BEFORE=` / `AFTER=` giúp thấy commit có đổi sau khi pull hay không.

### `concurrency`

```yaml
concurrency:
  group: deploy-production
  cancel-in-progress: false
```

Hai lần push gần nhau sẽ **không** hủy deploy đang chạy (tránh nửa chừng). Deploy xếp hàng / chạy tuần tự theo group.

### File `.env` trên VPS

- Nằm ở `/opt/api-ecommerce/.env`  
- **Không** commit lên GitHub  
- CD chỉ `git pull` + rebuild — **không ghi đè** `.env`  
→ Password DB / `NPM_NETWORK` vẫn giữ nguyên giữa các lần deploy  

---

## 5. Production sau khi deploy trông thế nào?

```
Internet
   │
   ▼
Cloudflare (DNS + SSL edge)
   │
   ▼
Nginx Proxy Manager (:80/:443)     ← đã cấu hình Proxy Host
   │
   ▼
ecommerce-api container (:3055)    ← Node Express
   │
   ▼
ecommerce-postgres                 ← PostgreSQL trong Docker network
```

GitHub Actions **không** cấu hình NPM / Cloudflare mỗi lần. Nó chỉ cập nhật **code + container API**.

---

## 6. Luồng một ngày làm việc (thực tế)

1. Sửa code trên máy  
2. `git add` → `git commit` → `git push origin main`  
3. Vào **Actions**:  
   - **CI** chạy check  
   - **Deploy production** SSH lên VPS  
4. Log Deploy thấy `AFTER=<commit mới>` và `Deploy OK`  
5. Mở https://api-ecommerce.nasbui.site/health  

Deploy tay (không đợi push): Actions → Deploy production → **Run workflow**.

Hoặc trên VPS:

```bash
bash deploy/scripts/deploy.sh
```

---

## 7. Phân biệt “Actions xanh” vs “VPS đã có code mới”

| Hiện tượng | Ý nghĩa |
|------------|---------|
| Chỉ **CI** xanh | Code pass check, **chưa chắc** đã lên VPS |
| **Deploy** xanh + log `AFTER` đổi | VPS đã pull đúng commit |
| Deploy xanh nhưng `BEFORE == AFTER` | VPS `git fetch` không thấy commit mới (chưa push / sai remote) |
| `/health` OK nhưng UI/Swagger cũ | Container chưa rebuild, hoặc CDN/cache — xem lại log `--build` |

Luôn mở đúng job **Deploy production**, không chỉ nhìn CI.

---

## 8. Lỗi thường gặp (và tầng nào lỗi)

| Lỗi | Tầng | Hướng xử lý |
|-----|------|-------------|
| `ssh: no key found` | Secret `VPS_SSH_KEY` | Dán lại **private** key đủ BEGIN/END |
| `unable to authenticate` | Key / user / authorized_keys | Test `ssh -i key user@host` từ máy khác |
| `VPS_APP_PATH is empty` | Secret thiếu | Thêm `/opt/api-ecommerce` |
| `network ... not found` | Docker NPM network | Sửa `NPM_NETWORK` trong `.env` trên VPS |
| `health` fail sau deploy | App / DB | `docker compose logs api` trên VPS |
| Cloudflare “Just a moment” | Bot challenge | Test `curl 127.0.0.1:3055/health` trên VPS |

---

## 9. Sơ đồ tổng thể (nhớ 1 hình)

```
┌─────────────┐     push      ┌──────────────────┐
│  Laptop     │ ───────────►  │  GitHub repo     │
│  (code)     │               │  main branch     │
└─────────────┘               └────────┬─────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                                     ▼
           ┌────────────────┐                   ┌────────────────────┐
           │  CI workflow   │                   │ Deploy workflow    │
           │  - node --check│                   │  - SSH bằng secret │
           │  - docker build│                   │  - git reset --hard│
           └────────────────┘                   │  - compose up      │
                                                └─────────┬──────────┘
                                                          ▼
                                                ┌────────────────────┐
                                                │ VPS                │
                                                │ /opt/api-ecommerce │
                                                │ + Docker + NPM     │
                                                │ → domain public    │
                                                └────────────────────┘
```

---

## 10. Gợi ý học thêm (khi đã quen)

1. Cho Deploy `needs: check` (đợi CI xanh mới deploy)  
2. Thêm test thật (`npm test`) vào CI  
3. Tag image theo commit SHA, rollback dễ hơn  
4. Thông báo Discord/Telegram khi deploy xong / fail  

Không cần làm ngay — pipeline hiện tại đã đủ cho portfolio / learning project.

---

## Tóm tắt một câu

> **CI** kiểm tra code trên máy ảo GitHub; **Deploy** SSH vào VPS, `git reset` về `main`, rebuild Docker bằng `.env` trên server, rồi gọi `/health` để chắc API còn sống.

File liên quan: `ci.yml`, `deploy.yml`, `docs/DEPLOY.md`, `docker-compose.prod.yml`.
