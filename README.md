# SDET Practice Lab

A full-stack practice shopping application by **Nirmal Kumar**, built for hands-on quality engineering.

Explore products, manage a cart, place simulated orders, and review purchase history. The application provides UI and API scenarios for a separate testing project.

**Demo only:** no real payments are processed and no products are shipped. Use fictional account and delivery information.

## Features

- Product catalogue with search, category filtering, stock filtering, sorting, and a maximum-price slider.
- Client-side pagination with six products per page.
- Comparison of up to three products.
- Product details with expandable delivery, payment, and stock information.
- Registration, login, logout, and database-backed sessions.
- Guest carts stored in the browser and account carts stored in PostgreSQL.
- Guest-to-account cart transfer with retry protection.
- Delivery validation and order review.
- Simulated checkout with stock validation and duplicate-order protection.
- Saved receipts and the latest 50 orders for each customer.
- D3 charts for daily spending and order counts, with a data-table alternative.
- Embedded delivery-help iframe.
- Docker services for the frontend, API, database, and migrations.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router |
| Charts | D3.js |
| API | Express, TypeScript, Zod |
| Database | PostgreSQL 17 |
| Database access and migrations | Prisma 7 |
| Password hashing | Argon2 |
| Containers | Docker Compose |
| Frontend server and API proxy | Nginx |
| Development checks | ESLint, TypeScript, GitHub Actions |

Automated UI/API testing and performance testing are a separate phase. The current focus is application development.

## Run with Docker

### Prerequisites

- Git
- Docker Desktop, running

### 1. Clone the repository

```bash
git clone https://github.com/nirmalthanga-qa/sdet-practice-lab.git
cd sdet-practice-lab
```

### 2. Configure a new environment

For a new clone without an existing `.env`:

```bash
cp .env.example .env
```

Edit `.env` and replace the example password consistently in:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `DOCKER_DATABASE_URL`

The database username and database name must also match across these settings.

`DATABASE_URL` uses `127.0.0.1` for tools running on your computer.
`DOCKER_DATABASE_URL` uses `db` for containers.

URL-encode reserved characters in credentials when placing them in connection URLs.

Do not commit `.env`. Do not overwrite an existing working `.env` with the template.

Changing PostgreSQL environment variables does not change credentials in an already initialized database volume.

### 3. Build and start

```bash
docker compose config --quiet
docker compose up -d --build --wait web
```

The migration service applies saved migrations before the API starts.

### 4. Insert sample products

```bash
docker compose run --rm migrate npm exec -- prisma db seed
```

The seed inserts missing products and skips existing IDs. It does not reset existing stock or prices.

### 5. Open the application

http://localhost:8080

Register a fictional account to try checkout and order history.

## Docker services

| Service | Purpose | Expected state |
| --- | --- | --- |
| `db` | PostgreSQL with persistent storage | Healthy |
| `migrate` | Applies pending migrations | Exited (0) |
| `api` | Compiled Express API | Healthy |
| `web` | Frontend and API reverse proxy | Healthy |

`migrate` exiting with code 0 is expected: it completes a task rather than running continuously.

The named database volume is `postgres_data`. Keep the same Compose project name/folder when reusing the existing database.

## Everyday commands

Start the application:

```bash
docker compose up -d --wait web
```

Stop services while preserving database data:

```bash
docker compose stop
```

Rebuild after source changes:

```bash
docker compose up -d --build --wait web
```

Inspect status and logs:

```bash
docker compose ps -a
docker compose logs --tail=80 web api
docker compose logs migrate
```

A restart alone does not include source changes in an image.

Do not use `docker compose down -v` for ordinary shutdowns: it removes the database volume.

## Local development

Use Node.js 24 and npm.

Install dependencies and generate the Prisma client:

```bash
npm ci
npx prisma generate
```

Stop the Docker frontend/API to free port 3001, then start PostgreSQL:

```bash
docker compose stop web api
docker compose up -d --wait db
```

Apply existing migrations and seed if needed:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Start the API in one terminal:

```bash
npm run dev:api
```

Start the frontend in another terminal:

```bash
npm run dev
```

Open http://localhost:5173.

Vite forwards `/api` requests to the API on port 3001.

To switch back to Docker, stop the local API and Vite processes, then run:

```bash
docker compose up -d --build --wait web
```

Guest carts at ports 5173 and 8080 are separate because browser storage is scoped by origin.

## Build and validation

```bash
npm run lint
npm run typecheck:api
npm run build
```

Run the compiled API with PostgreSQL available and port 3001 free:

```bash
npm run start:api
```

## Database maintenance

Check Docker migration status:

```bash
docker compose run --rm migrate npm exec -- prisma migrate status
```

Apply saved migrations:

```bash
docker compose run --rm migrate npm exec -- prisma migrate deploy
```

After changing seed data or migration files, rebuild the tools image:

```bash
docker compose build migrate
```

Run the seed:

```bash
docker compose run --rm migrate npm exec -- prisma db seed
```

Use `npm exec -- prisma` so the seed subprocess can find installed tools such as `tsx`.

Inspect database records from your computer:

```bash
npx prisma studio
```

After intentionally changing `prisma/schema.prisma`, create a migration locally:

```bash
npx prisma migrate dev --name describe_your_change
npx prisma generate
```

Review and commit the schema and generated migration files.

### Restore sample stock

Run this between testing sessions when nobody is placing an order. It sets exact baseline quantities and preserves users, carts, orders, and prices.

```bash
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
UPDATE "Product" AS product
SET "stock" = baseline.stock
FROM (
  VALUES
    ('keyboard', 18),
    ('headphones', 12),
    ('speaker', 0),
    ('mouse', 25),
    ('monitor', 5),
    ('desk-lamp', 1),
    ('laptop-stand', 0),
    ('microphone', 8),
    ('earbuds', 15)
) AS baseline(id, stock)
WHERE product."id" = baseline.id
RETURNING product."id", product."name", product."stock";
SQL
```

Refresh the browser afterward. No image rebuild is required.

Speaker and laptop stand intentionally remain out of stock for testing. Newly added products are unaffected unless included in the SQL.

## API overview

Use `/api` on the frontend origin, or `http://127.0.0.1:3001/api` for direct local API requests.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API process health |
| GET | `/api/products` | Product catalogue |
| GET | `/api/products/:productId` | Product details |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Check session |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/cart` | Account cart |
| PUT | `/api/cart/items/:productId` | Set quantity |
| DELETE | `/api/cart/items/:productId` | Remove cart item |
| DELETE | `/api/cart` | Clear cart |
| POST | `/api/cart/transfer` | Transfer guest items |
| POST | `/api/orders` | Place a practice order |
| GET | `/api/orders` | Latest 50 account orders |
| GET | `/api/orders/:orderId` | Account-owned order details |

Account cart and order endpoints require a valid session cookie.

Use JSON for registration, login, cart updates, transfers, and checkout. Logout expects an application/json request, such as `{}`.

Postman and the browser have separate cookie stores. Sign in separately when using Postman, and use a consistent hostname.

## Important behavior

- Adding to a cart does not reserve stock.
- Checkout validates current prices, quantities, and stock.
- A confirmed order reduces stock and removes purchased cart items.
- Retry an uncertain checkout with the same checkout ID and request details.
- A delivery email may differ from the signed-in account email.
- Order ownership comes from the authenticated session.
- Saved receipts retain purchased product names and prices.
- Payment is simulated; the total equals the product subtotal.
- Charts cover the loaded latest 50 orders, not necessarily all historical purchases.
- Comparison selections reset when leaving the shop page or refreshing.

## Troubleshooting

| Problem | Action |
| --- | --- |
| Site unreachable | Check `docker compose ps -a`, then run `docker compose up -d --wait web`. |
| API/web show Created | Inspect the error printed by the startup command. |
| Port 3001 occupied | Stop the local API before starting Docker API. |
| Missing DOCKER_DATABASE_URL | Add it to the project-root `.env`. |
| Seed reports `spawn tsx ENOENT` | Run seeding through `npm exec -- prisma`. |
| Code changes not visible | Rebuild the Docker images. |
| Updated stock not visible | Refresh the whole browser page. |
| Health works but products fail | Check database credentials, migrations, and API logs. |

## Deployment status

The Compose configuration is a local HTTP setup with loopback-bound ports.

Public deployment still requires HTTPS, secure-cookie configuration, proxy-aware rate limiting, backup procedures, and a deployment review.

Keyboard-friendly controls, semantic labels, and table alternatives are included, but this is not a claim of completed accessibility certification.

## Author

**Nirmal Kumar**

Built as a portfolio project and a practical environment for quality engineering.