# E-commerce Backend API

A RESTful backend for e-commerce workflows built with **Node.js, Express, and PostgreSQL**. The project uses a layered architecture and covers core domain features: authentication, products, cart, vouchers, and checkout review.

> **Note:** This is a learning/portfolio project. It is not a full production marketplace (order placement, payment gateway, and shipping are still in progress).

---

## Features

### Authentication & security
- User registration and login (JWT access + refresh tokens)
- Logout and refresh token rotation (reuse detection)
- **Forgot password** — email reset link with time-limited token
- **Email verification** — verify account via link; resend verification email
- API key middleware (`x-api-key`) with permission checks
- Password hashing with bcrypt

### Product
- Create products by type: **Electronics**, **Clothing** (Factory pattern)
- Update, publish / unpublish, draft / published listings
- Full-text search and public product listing
- Inventory row created on product creation

### Cart
- Add, update quantity, remove item, clear cart, list items
- Validate published products and stock availability
- Upsert quantity with PostgreSQL `ON CONFLICT`

### Discount
- Shop-created voucher codes (fixed amount / percentage)
- Apply to all shop products or specific products
- Calculate discount amount (`POST /discount/amount`)
- Max uses, per-user limits, minimum order value

### Checkout
- **Order review** before placement: server-side pricing, cart/stock/shop validation, voucher application
- **Place order** (`POST /checkout/order`): 1 shop = 1 order, stock deduction + snapshots in one Postgres transaction

### Other
- Swagger UI at `/api-docs`
- Centralized error handling + `asyncHandler`

---

## Roadmap

**Auth Phase 1 — done** (see [docs/AUTH_PHASE1.md](docs/AUTH_PHASE1.md))

- [x] Login flow (JWT + refresh token)
- [x] Forgot password (reset via email)
- [x] Email verification + resend
- [x] Profile `GET /shop/me`
- [ ] OAuth (Google / …) — later phase
- [x] `orderByUser`: create order + deduct stock + complete cart (single transaction)
- [ ] Redis lock + inventory reservation
- [x] Unit tests (Jest — stock deduct, order repo, checkout review)
- [x] Deploy to VPS (see [docs/DEPLOY.md](docs/DEPLOY.md))

---

## Tech stack

| Layer | Technology |
|--------|------------|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | PostgreSQL (`pg`) |
| Auth | JWT, bcrypt |
| Email | SMTP (forgot password & verification) |
| Docs | Swagger (OpenAPI 3) |
| Middleware | helmet, cors, morgan, compression |

---

## Architecture

```
src/
├── routes/               # HTTP endpoints
├── controllers/          # Request / response adapters
├── services/             # Business logic
├── models/repositories/  # SQL data access
├── auth/                 # JWT & API key middleware
├── core/                 # Success / error response classes
├── configs/              # DB config, Swagger
├── helpers/              # asyncHandler, transaction helper
└── dbs/                  # Postgres pool init
```

Request flow: **Route → Controller → Service → Repository → PostgreSQL**

---

## Getting started

See also: [Deploy & CI/CD](docs/DEPLOY.md) — Cloudflare + **Nginx Proxy Manager** + VPS (`api-ecommerce.nasbui.site`).

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- SMTP credentials (for email features)

### 1. Clone & install

```bash
git clone <repo-url>
cd shopee-clone
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
PORT=3055
NODE_ENV=dev

DEV_DB_HOST=localhost
DEV_DB_PORT=5432
DEV_DB_USER=postgres
DEV_DB_PASSWORD=your_password
DEV_DB_NAME=shopee_clone

# Email (forgot password & verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=noreply@yourapp.com

APP_URL=http://localhost:3055
```

> All `/v1/api/*` routes require a valid `x-api-key` header. Seed an API key via `docs/shopee_clone_db.sql`.

### 3. Initialize database

```bash
psql -U postgres -d shopee_clone -f docs/shopee_clone_db.sql
```

See also: `docs/shopee_clone_db.sql`, `docs/database_schema.dbml`.

### 4. Run the server

```bash
# Development (auto reload)
npm run dev

# Unit tests (no DB required — mocked)
npm test

# Production
npm start
```

Default URL: `http://localhost:3055`

---

## API documentation

After starting the server:

- **Swagger UI:** [http://localhost:3055/api-docs](http://localhost:3055/api-docs)
- **OpenAPI JSON:** [http://localhost:3055/api-docs.json](http://localhost:3055/api-docs.json)

### Common headers

| Header | Description |
|--------|-------------|
| `x-api-key` | Required for all `/v1/api/*` routes |
| `authorization` | JWT access token (protected routes) |
| `x-client-id` | User / shop id (protected routes) |

### Main endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/api/shop/signup` | Register |
| POST | `/v1/api/shop/signin` | Login |
| POST | `/v1/api/shop/logout` | Logout |
| POST | `/v1/api/shop/refresh-token` | Refresh access token |
| POST | `/v1/api/shop/forgot-password` | Send password reset email |
| POST | `/v1/api/shop/reset-password` | Reset password with token |
| POST | `/v1/api/shop/verify-email` | Verify email with token |
| POST | `/v1/api/shop/resend-verification` | Resend verification email |
| GET | `/v1/api/shop/me` | Get current user profile |
| POST | `/v1/api/product` | Create product |
| GET | `/v1/api/product/find-all` | List published products |
| GET / POST / DELETE | `/v1/api/cart` | Cart operations |
| POST / GET | `/v1/api/discount` | Voucher management |
| POST | `/v1/api/discount/amount` | Calculate discount |
| POST | `/v1/api/checkout/review` | Review order before checkout |
| POST | `/v1/api/checkout/order` | Place order (1 shop = 1 order) |

Sample requests: `src/postman/access.post.http`

---

## Typical flow

1. **Sign up** → receive verification email → **verify email**
2. **Sign in** → get `accessToken`, `refreshToken`, `userId`
3. **Create & publish product** (shop)
4. **Add to cart** (buyer)
5. **Checkout review** with `cartId`, `shop_order_ids`, optional voucher
6. **Place order** → deduct stock, create `orders` + `order_items`, complete cart items

### Forgot password flow

1. `POST /shop/forgot-password` with `{ "email": "..." }`
2. User opens link from email → `POST /shop/reset-password` with `{ "token": "...", "newPassword": "..." }`
3. Sign in with new password

---

## Project docs

| File | Description |
|------|-------------|
| `docs/AUTH_PHASE1.md` | **Auth Phase 1 guide** — verify email, forgot/reset, refresh headers, checklist |
| `docs/DEPLOY.md` | Deploy VPS + NPM + Cloudflare |
| `docs/CI_CD_EXPLAINED.md` | How CI/CD workflows work (explained) |
| `docs/migrations/001_account_email_auth.sql` | Migration: email verify + reset columns |
| `docs/shopee_clone_db.sql` | PostgreSQL schema |
| `docs/requirements.md` | Business requirements |
| `docs/architecture_db.md` | Why SQL over NoSQL |
| `docs/jwt-middleware.md` | JWT middleware notes |

---

## Developer notes

- Stock is currently validated against `products.product_quantity`; the `inventories` table is prepared for reservation-based stock.
- `cart_state` supports multiple values, but the app currently uses `active` only. Order lifecycle statuses will live in the **Order** module.
- Some discount service methods (`delete`, `cancel`) exist but are not exposed as routes yet.

---

## License

ISC — learning / portfolio project.
