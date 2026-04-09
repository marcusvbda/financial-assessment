# Development Prompts — Hypothetical credit card company Backend

Prompts used during development to bootstrap and evolve the backend. Written to delegate implementation of well-defined decisions, not to discover what to build.

---

## Prompt 1 — Data Persistence Service

Set up a simple file-based persistence layer in TypeScript at `src/collections.ts`. It should store each collection as a separate JSON file under `src/data/`, using synchronous fs operations. Expose generic CRUD methods: `load`, `get` (with optional filter callback), `insert` (auto-generates integer id), `update` (by id), and `delete` (with optional filter). Export as default. No error handling beyond what TypeScript strict mode requires.

---

## Prompt 2 — Project Bootstrap and Users Domain

Bootstrap an Express + TypeScript backend with domain-driven file organization. Stack: Node 20, Express 4, Zod for validation, swagger-jsdoc + swagger-ui-express for docs, tsx for dev, tsc for build.

Structure it as:

```text
src/
  app.ts          – express instance, cors, json, swagger, routes mount
  index.ts        – listen on PORT env or 3001
  swagger.ts      – swagger-jsdoc config with bearerAuth security scheme
  routes/
    index.ts      – route aggregator
  domain/
    users/        – model, schema, service, routes
  middlewares/
  services/
    collections.ts
```

For the users domain:

- **model**: raw CRUD over the persistence layer, types `User` and `SafeUser` (without password)
- **schema**: Zod schemas for create (all fields required) and update (all optional, at least one required via refine)
- **service**: business logic — hash passwords with bcrypt on create/update, sanitize before returning
- **routes**: full REST (GET /, GET /me, GET /:id, POST /, PUT /:id, DELETE /:id) with inline Swagger JSDoc on each

The route aggregator should apply `isAuthenticated` globally to `/users`. Role guards go inside the domain router, not here — this keeps the aggregator clean and allows per-route role overrides.

---

## Prompt 3 — Auth Middlewares and Auth Domain

Add JWT-based authentication and RBAC to the backend.

**Middlewares** (`src/middlewares/`):

- `validate.ts` — generic Zod middleware, responds 400 with `{ errors: fieldErrors }` on failure
- `auth.ts` — `isAuthenticated`: reads `Authorization: Bearer <token>`, verifies JWT, checks revocation list, attaches `req.user = { id, role, jti }`. Export `AuthRequest` interface extending Express `Request`.
- `role.ts` — `requireRole(...roles)`: 403 if `req.user.role` not in the allowed list

**Auth domain** (`src/domain/auth/`):

- `auth.schema.ts` — Zod schema for login (email + password)
- `auth.service.ts` — `login` (bcrypt verify + JWT sign with jti from `crypto.randomUUID()`), `revoke` (persist jti), `isRevoked` (lookup), `verify` (jwt.verify wrapped in try/catch). JWT secret from env with `'changeme'` fallback, 8h expiry.
- `auth.routes.ts` — `POST /login` (public) and `POST /revoke` (requires `isAuthenticated`, returns 204)

Apply `requireRole('manager')` individually on each user route except `GET /me`, which should be accessible to any authenticated user regardless of role.

---

## Prompt 4 — Integration Tests

Write integration tests for the auth and users domains using Jest + supertest. Mock `src/services/collections` entirely — no test should touch the filesystem.

For tokens, sign real JWTs using the same secret (`process.env.JWT_SECRET ?? 'changeme'`) so they pass through the actual `isAuthenticated` middleware. Use `bcrypt.hashSync` with `saltRounds = 1` in mock data for speed.

Cover:

- **Auth routes**: login validation (400), invalid credentials (401), successful login returns token, revoke returns 204 and persists jti
- **User routes — guards**: every manager-only route (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`) must return 401 without token and 403 with a client token. Use `describe.each` to avoid repeating this for each route.
- **User routes — /me**: must return 200 for both `manager` and `client` roles, 401 without token
- **User routes — happy path**: standard CRUD assertions (200/201/204, no password in response, 404 when not found, 400 on schema violations)

Watch out: `isAuthenticated` calls `db.get('revoked-tokens', ...)` on every request. Any test that also mocks `db.get` for another collection needs to use `mockImplementation` and branch by the index argument.
