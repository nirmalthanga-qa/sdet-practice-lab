# SDET Practice Lab — Maintenance Commands

Updated: 28 October 2026  
Owner: Nirmal Kumar

This guide covers the current local Docker setup and local development workflow. Run commands from the project root unless stated otherwise.

```bash
cd ~/Documents/sdet-practice-lab
```

## 1. Prerequisites and addresses

- Start Docker Desktop before Docker commands.
- Keep your project `.env` configured. Never commit it or paste its credentials into public logs.
- Docker application: http://localhost:8080
- Local Vite application: http://localhost:5173
- API: http://127.0.0.1:3001/api/health
- Products API through Docker frontend: http://localhost:8080/api/products
- PostgreSQL from your Mac: `127.0.0.1:5432`
- PostgreSQL from Compose containers: `db:5432`

Your local `DATABASE_URL` uses localhost/127.0.0.1. Your `DOCKER_DATABASE_URL` uses hostname `db`, with the same database credentials. Preserve URL encoding in credentials.

The current Compose setup is for local HTTP. `SESSION_COOKIE_SECURE=false` is a local override; use secure cookies for public HTTPS deployment.

## 2. Everyday Docker commands

| Purpose | Command |
| --- | --- |
| Start the full application and wait for readiness | `docker compose up -d --wait web` |
| Stop services, preserving database data | `docker compose stop` |
| Start PostgreSQL only | `docker compose up -d --wait db` |
| Show all containers, including completed services | `docker compose ps -a` |
| View recent frontend/API logs | `docker compose logs --tail=80 web api` |
| Follow API logs | `docker compose logs -f api` |
| View database logs | `docker compose logs --tail=80 db` |
| View migration logs | `docker compose logs migrate` |
| Restart the API using its existing container/image | `docker compose restart api` |
| Validate Compose without printing resolved credentials | `docker compose config --quiet` |
| Show API images | `docker image ls sdet-practice-lab-api` |
| Show frontend images | `docker image ls sdet-practice-lab-web` |

Press Control + C to stop following logs; it does not stop the containers.

Expected status:

| Service | Expected state |
| --- | --- |
| db | Running / healthy |
| migrate | Exited (0): completed successfully |
| api | Running / healthy |
| web | Running / healthy |

The API health endpoint checks that Express responds. A successful products request also checks database access.

## 3. Rebuild after code changes

```bash
docker compose up -d --build --wait web
```

This rebuilds the relevant images and starts the application dependencies. A container restart alone does not include edited source code.

To build images separately:

```bash
docker compose build api web migrate
```

To rebuild the tools image after editing seed files or migrations:

```bash
docker compose build migrate
```

Standalone API image build, if needed:

```bash
docker build -f Dockerfile.api -t sdet-practice-lab-api:local .
```

Database record changes do not require rebuilding images. Refresh the browser to reload prices and stock.

## 4. Database migrations

Check migration status:

```bash
docker compose run --rm migrate npm exec -- prisma migrate status
```

Apply existing migration files:

```bash
docker compose run --rm migrate npm exec -- prisma migrate deploy
```

The Compose migration service also runs before API startup. Applied migrations are tracked by Prisma; an up-to-date database reports no pending migrations.

After intentionally editing `prisma/schema.prisma`, create a new migration locally. Replace the example name with a description of your change:

```bash
npx prisma migrate dev --name describe_your_change
npx prisma generate
```

Commit the schema and generated migration directory. Then rebuild the Docker application:

```bash
docker compose up -d --build --wait web
```

Use `migrate dev` to author migrations during development; use `migrate deploy` to apply saved migrations. Review migration SQL, especially changes that drop columns or tables. Do not accept a reset prompt on a database whose data you want to retain.

Validate the schema locally:

```bash
npx prisma validate
```

## 5. Seed sample products

```bash
docker compose run --rm migrate npm exec -- prisma db seed
```

Use `npm exec -- prisma` here: it makes project tools such as `tsx` available to the seed subprocess. Calling Prisma's binary directly caused `spawn tsx ENOENT` in this setup.

After editing the seed data:

```bash
docker compose build migrate
docker compose run --rm migrate npm exec -- prisma db seed
```

The current seed uses `createMany` with `skipDuplicates: true`:

- Missing product IDs are inserted.
- Existing products are not overwritten.
- Existing stock and prices are preserved.
- Existing users, carts, and orders remain.
- If all nine sample products exist, expect `Inserted 0 new products.`

**Seeding does not replenish sold-out products.** Use the stock commands below.

## 6. Restore original sample stock

Run this between manual testing sessions when nobody is placing an order. It sets the nine sample products to exact baseline quantities; it does not add these quantities to remaining stock.

It does not delete accounts, carts, or orders and does not change product prices. Existing order receipts remain unchanged. Existing carts are retained and availability is checked again at checkout.

Start the database if needed:

```bash
docker compose up -d --wait db
```

Paste the complete block:

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

| Product ID | Baseline stock |
| --- | ---: |
| keyboard | 18 |
| headphones | 12 |
| speaker | 0 |
| mouse | 25 |
| monitor | 5 |
| desk-lamp | 1 |
| laptop-stand | 0 |
| microphone | 8 |
| earbuds | 15 |

Speaker and laptop stand intentionally remain unavailable for out-of-stock testing. Products added later are untouched unless added to this SQL.

Refresh the browser afterward. No API restart or image rebuild is needed.

### Set one product to a specific stock level

Example: restore the keyboard to 18 units.

```bash
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
UPDATE "Product"
SET "stock" = 18
WHERE "id" = 'keyboard'
RETURNING "id", "name", "stock";
SQL
```

Change the product ID and quantity deliberately. This command sets the quantity rather than incrementing it.

### Inspect current stock

```bash
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT "id", "name", "stock", "pricePaise"
FROM "Product"
ORDER BY "displayOrder", "id";
SQL
```

## 7. View users and other records

With PostgreSQL running and local dependencies installed:

```bash
npx prisma studio
```

Open the URL printed in the terminal. Use the User, Product, Order, and other tables to inspect data.

Current user-deletion behavior:

- Deleting a disposable account without orders also deletes its related sessions, cart items, and cart-transfer records.
- Accounts with orders cannot be deleted directly because the Order-to-User relation restricts deletion.
- Do not expose password hashes or personal details in shared screenshots.
- Deleting orders is not a stock-replenishment method. It does not automatically restore stock.

## 8. Local development with automatic reload

Stop the Docker frontend and API to free port 3001, leaving the database available:

```bash
docker compose stop web api
docker compose up -d --wait db
```

Terminal 1 — API:

```bash
npm run dev:api
```

Terminal 2 — frontend:

```bash
npm run dev
```

Open http://localhost:5173.

To switch back to Docker:

1. Stop both local development processes with Control + C in their terminals.
2. Run:

```bash
docker compose up -d --build --wait web
```

3. Open http://localhost:8080.

Guest cart storage is browser-origin-specific: carts at port 5173 and port 8080 are separate. Account carts and orders are stored in the database.

## 9. Build and code-quality commands

| Purpose | Command |
| --- | --- |
| Install exact locked dependencies | `npm ci` |
| Lint the project | `npm run lint` |
| Check API TypeScript | `npm run typecheck:api` |
| Generate Prisma client and compile API | `npm run build:api` |
| Build API and frontend | `npm run build` |
| Run compiled API | `npm run start:api` |
| Generate Prisma client explicitly | `npx prisma generate` |

Run `npm run start:api` after building, with PostgreSQL available and port 3001 free.

The Vite preview command is `npm run preview`; it is not the full Docker stack or a replacement for the API service.

## 10. Before committing

```bash
npm run lint
npm run build
git status
git diff
```

Stage only the files you intend to include:

```bash
git add path/to/changed-file
git diff --cached
git commit -m "Describe the change"
git push
```

Replace the example path and message. Ensure `package-lock.json` is committed when dependency changes update it.

Keep these out of Git:

- `.env` and secret-bearing environment files
- `node_modules`
- `dist` and `dist-server`
- Generated Prisma client output
- Test reports and temporary logs

Use `.env.example` for configuration names and placeholders, never real credentials.

## 11. First-time setup on another machine

Prerequisites: Git and Docker Desktop.

```bash
git clone https://github.com/nirmalthanga-qa/sdet-practice-lab.git
cd sdet-practice-lab
```

Create `.env` with the project's required configuration:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL` — hostname localhost or 127.0.0.1 for local tools
- `DOCKER_DATABASE_URL` — hostname db for Compose services

Use matching credentials/database names in both connection URLs. If a maintained `.env.example` is available, copy it and replace its placeholders.

Then:

```bash
docker compose config --quiet
docker compose up -d --build --wait web
docker compose run --rm migrate npm exec -- prisma db seed
```

Open http://localhost:8080. Register a fictional practice account. To use local Node development tools as well, install the project's supported Node version (currently Node 24) and run `npm ci`.

## 12. Troubleshooting

| Symptom | Check or action |
| --- | --- |
| Site cannot be reached | Run `docker compose ps -a`, then `docker compose up -d --wait web`. |
| API/web status is Created | Startup did not finish. Run `docker compose up -d --wait web` and inspect its error. |
| Port 3001 already in use | Stop the local API terminal before starting the Docker API. |
| Missing DOCKER_DATABASE_URL | Add it to the project-root `.env`, save, then run Compose from that folder. |
| Seed reports spawn tsx ENOENT | Use `docker compose run --rm migrate npm exec -- prisma db seed`. |
| Migration container shows Exited (0) | Expected: its task completed successfully. |
| Source changes do not appear | Rebuild with `docker compose up -d --build --wait web`. |
| Stock update not visible | Refresh the whole browser page to reload the catalogue. |
| Login fails after switching setups | Confirm API health and cookie configuration, then sign in again on the intended app URL. |
| API health works but products fail | Check API/database logs and confirm migrations and database credentials. |

Useful diagnostics:

```bash
docker compose ps -a
docker compose logs --tail=80 web api
docker compose logs --tail=80 db migrate
```

Do not share environment files or unredacted connection strings.

## 13. Preserve your database

Use `docker compose stop` for ordinary shutdowns.

**Do not use `docker compose down -v` for routine maintenance.** The `-v` option removes the Compose-managed database volume and its data.

Likewise, `prisma migrate reset` is destructive; it is not needed to replenish stock. Use the targeted stock commands in section 6.

The current named volume is `postgres_data`. Keep the same Compose project folder/project name when you want to reuse the current database.

---

These commands describe the local development and Docker workflow as of 28 October 2026. Public deployment, HTTPS, backup procedures, and the separate automation project need their own configuration.

