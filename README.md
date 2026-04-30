# Modern ERP Backend

NestJS monorepo for the Modern ERP platform — admin, staff, and gateway.

## Before you run anything

**You must fill in `.env` with real values before running migrations, booting services, or running integration tests.**

The committed `.env` ships with placeholder values. Replace them with:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — your Postgres connection (the Ubuntu server's `modern_erp_dev_db` during development, `modern_erp_prod_db` in production)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` — your Redis connection
- `SEED_SUPER_ADMIN_*` — the initial super-admin credentials (change before first boot)
- `GLITCHTIP_DSN` — optional; leave blank to disable error reporting

`.env` is gitignored. `.env.example` is the template.

## What works after Phase 1

Phase 1 delivers:
- Monorepo scaffold (`apps/`, `libs/`, `proto/`, `db/`, docker-compose, tsconfig, eslint)
- `@modern_erp/common` — Platform, Module, ErrorCode enums; JwtPayload, UserContext, CachedUser, GatewayRequest, logger interfaces; Public + UserCtx decorators; extractGrpcContext utility; GRPC_SERVICES config (admin + staff only)
- `@modern_erp/logger` — ModernERPLogger with 4 capture methods
- `@modern_erp/grpc-types` — auto-generated TypeScript from `admin.proto` and `staff.proto`
- `db/data-source.ts` — shared TypeORM DataSource for migrations (reads `.env`)
- `docker-compose.yml` — local Postgres + Redis (not used here since you're pointing at Ubuntu; keep for fallback)

Unit tests: 20 passing across the libs.

## Commands

```bash
npm install              # install dependencies
npm run proto:gen        # regenerate TS types from proto/ (git-ignored output)
npm test                 # run all unit tests
npm run lint             # eslint --fix across apps/libs
npm run migration:run    # apply pending migrations (requires .env with real DB)
```

## Phase status

- [x] Phase 1 — foundation (this phase)
- [ ] Phase 2 — admin
- [ ] Phase 3 — staff
- [ ] Phase 4 — gateway
- [ ] Phase 5 — MD doc updates

See `../docs/superpowers/plans/` for each phase's plan.
# modern_erp_backend
