# Auth Phase 1 — Email verification & forgot password

**Status: done**

Phase 1 hoàn thiện auth **email/password + JWT** (chưa có OAuth Google/GitHub).

| Feature | Status |
|---------|--------|
| Signup / Signin (JWT access + refresh) | Done |
| Logout | Done |
| Refresh token + rotation + reuse detection | Done |
| Profile `GET /shop/me` | Done |
| Email verification + resend | Done |
| Forgot / reset password | Done |
| SMTP mail (Nodemailer) | Done |
| OAuth (Google, …) | Not in Phase 1 |

---

## Prerequisites

1. PostgreSQL đã có schema (hoặc chạy full `docs/shopee_clone_db.sql`).
2. Migration email columns (DB cũ):

```bash
# Local
psql -U postgres -d shopee_clone -f docs/migrations/001_account_email_auth.sql

# VPS (Docker)
docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres \
  psql -U ecommerce -d ecommerce < docs/migrations/001_account_email_auth.sql
```

Migration thêm: `email_verified`, `email_verify_token`, `email_verify_expires`, `password_reset_token`, `password_reset_expires`. Tài khoản cũ không có verify token được set `email_verified = TRUE` để vẫn login được.

3. SMTP trong `.env` (xem `.env.example`):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_real_gmail@gmail.com
SMTP_PASS=xxxx_xxxx_xxxx_xxxx   # Gmail App Password (cần bật 2FA)
MAIL_FROM="Ecom API <your_real_gmail@gmail.com>"
APP_URL=http://localhost:3055
```

Nếu SMTP còn placeholder / thiếu → mail **không gửi**; token được **in ra console** server (`[MailService] SMTP not configured`).

4. Mọi route `/v1/api/*` cần header `x-api-key` (seed trong `docs/shopee_clone_db.sql`).

Swagger: [http://localhost:3055/api-docs](http://localhost:3055/api-docs)

---

## Security model (tóm tắt)

- Password: **bcrypt**.
- Verify / reset token: client nhận **raw token**; DB lưu **SHA-256 hash**.
- Verify token hết hạn **24h**; reset token **1h**.
- `forgot-password` / `resend-verification` trả message trung tính (không lộ email có tồn tại hay không).
- Login **bắt buộc** `email_verified = true`.
- Signup **không** trả JWT — phải verify rồi mới signin.
- Reset password thành công → xóa `key_stores` (buộc login lại).

---

## Flow A — Đăng ký & xác thực email

```
Signup → account (email_verified=false) + verify token
     → email (hoặc console log)
     → POST /verify-email { token }
     → email_verified=true
     → Signin → accessToken + refreshToken + userId
```

### 1. Signup

`POST /v1/api/shop/signup`

```http
POST /v1/api/shop/signup
Content-Type: application/json
x-api-key: <API_KEY>

{
  "email": "you@gmail.com",
  "password": "secret123"
}
```

Response (ý): `userId`, `account` (`email_verified: false`), không có `tokens`.

### 2. Lấy verify token

- Inbox mail, hoặc
- Log terminal / Docker logs nếu SMTP chưa cấu hình.

### 3. Verify

`POST /v1/api/shop/verify-email`

```json
{ "token": "<raw_token_from_email>" }
```

### 4. Resend (nếu hết hạn / mất mail)

`POST /v1/api/shop/resend-verification`

```json
{ "email": "you@gmail.com" }
```

### 5. Signin

`POST /v1/api/shop/signin`

```json
{ "email": "you@gmail.com", "password": "secret123" }
```

Lấy từ response:

| Field | Dùng cho |
|-------|----------|
| `metadata.userId` / `metadata.account.id` | Header `x-client-id` |
| `metadata.tokens.accessToken` | Header `authorization` |
| `metadata.tokens.refreshToken` | Header `x-refresh-token` |

Chưa verify → **400** `Please verify your email before logging in!`

---

## Flow B — Forgot / reset password

```
Forgot → (nếu email tồn tại) reset token + mail
      → POST /reset-password { token, newPassword }
      → login với password mới
```

### 1. Forgot

`POST /v1/api/shop/forgot-password`

```json
{ "email": "you@gmail.com" }
```

### 2. Reset

`POST /v1/api/shop/reset-password`

```json
{
  "token": "<raw_token_from_email>",
  "newPassword": "newsecret123"
}
```

Password tối thiểu 6 ký tự.

---

## Flow C — Session (sau khi đã login)

### Headers chung (protected)

| Header | Giá trị |
|--------|---------|
| `x-api-key` | API key |
| `x-client-id` | `userId` từ login |
| `authorization` | **accessToken** (không cần prefix `Bearer`) |

### Profile

`GET /v1/api/shop/me`

### Logout

`POST /v1/api/shop/logout`  
(xóa key store của user)

### Refresh token

`POST /v1/api/shop/refresh-token`

**Không** gửi refresh token trong body / `authorization`.

| Header | Giá trị |
|--------|---------|
| `x-api-key` | API key |
| `x-client-id` | user id |
| `x-refresh-token` | **refreshToken** hiện tại |

Mỗi refresh token chỉ dùng **một lần** (rotation). Sau response 200 phải dùng `refreshToken` mới. Dùng lại token cũ → 401 / Forbidden (reuse detection).

---

## Quick test checklist (Swagger hoặc HTTP)

1. [ ] Signup email mới → không login được trước verify  
2. [ ] Verify bằng token từ mail/console → login OK  
3. [ ] `GET /shop/me` với `authorization` + `x-client-id`  
4. [ ] Refresh bằng `x-refresh-token` → nhận cặp token mới  
5. [ ] Refresh lại bằng token cũ → lỗi  
6. [ ] Forgot → reset → login password mới  
7. [ ] Logout → access cũ không dùng được  

Sample file: `src/postman/access.post.http`

---

## Files liên quan

| Path | Role |
|------|------|
| `docs/migrations/001_account_email_auth.sql` | Migration columns |
| `src/configs/mail.js` | Nodemailer / placeholder detect |
| `src/services/mail.service.js` | Verify + reset email templates |
| `src/services/access.service.js` | Business logic Phase 1 |
| `src/controllers/access.controller.js` | HTTP adapters |
| `src/routes/access/index.js` | Public vs protected routes |
| `src/auth/auth-utils.js` | JWT + `authenticationV2` |
| `src/configs/swagger.js` | OpenAPI docs |

---

## Không nằm trong Phase 1

- OAuth / social login  
- Magic link clickable (hiện email chứa token + hướng dẫn gọi API)  
- Auto-resend verification khi login unverified  
- Frontend UI xác thực  

Phase tiếp theo gợi ý: **place order** (`orderByUser`) + inventory, hoặc OAuth nếu ưu tiên auth social.
