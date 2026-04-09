# Development Prompts — Hypothetical Credit Card Company Backend

Prompts used during development to bootstrap and evolve the backend.
They were written to **delegate implementation of well-defined decisions**, not to discover what to build.

Each prompt includes its objective, the exact instruction given to AI, and the resulting outcome.

---

## Prompt 1 — Data Persistence Service

**Objective**

Implement a lightweight persistence layer aligned with the assessment constraint of avoiding a real database, while still providing a reusable abstraction for CRUD operations.

**Prompt**

Set up a simple file-based persistence layer in TypeScript at `src/collections.ts`. It should store each collection as a separate JSON file under `src/data/`, using synchronous fs operations. Expose generic CRUD methods: `load`, `get` (with optional filter callback), `insert` (auto-generates integer id), `update` (by id), and `delete` (with optional filter). Export as default. No error handling beyond what TypeScript strict mode requires.

**Result**

* A generic persistence service used across domains
* JSON-based storage per collection
* Consistent CRUD interface (`load`, `get`, `insert`, `update`, `delete`)
* Enabled fast development without introducing database complexity

**Notes**

The generated implementation aligned closely with the intended simplicity. No additional abstraction was introduced to avoid overengineering given the scope of the assessment.

---

## Prompt 2 — Project Bootstrap and Users Domain

**Objective**

Bootstrap the backend with a clear, scalable structure and implement the users domain following a domain-driven design approach.

**Prompt**

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
  collections.ts
```

For the users domain:

* **model**: raw CRUD over the persistence layer, types `User` and `SafeUser` (without password)
* **schema**: Zod schemas for create (all fields required) and update (all optional, at least one required via refine)
* **service**: business logic — hash passwords with bcrypt on create/update, sanitize before returning
* **routes**: full REST (GET /, GET /me, GET /:id, POST /, PUT /:id, DELETE /:id) with inline Swagger JSDoc on each

The route aggregator should apply `isAuthenticated` globally to `/users`. Role guards go inside the domain router, not here — this keeps the aggregator clean and allows per-route role overrides.

**Result**

* Fully structured backend with clear separation of concerns
* Users domain implemented with model, schema, service, and routes
* Password hashing and response sanitization in place
* Swagger documentation integrated across endpoints
* Authentication middleware correctly applied at the routing layer

**Notes**

The generated structure matched the intended architecture closely. Minor adjustments were made to improve naming consistency and ensure strict separation between model and service responsibilities.

---

## Prompt 3 — Auth Middlewares and Auth Domain

**Objective**

Introduce authentication and authorization mechanisms, including JWT-based authentication and role-based access control (RBAC), consistent with real-world backend patterns.

**Prompt**

Add JWT-based authentication and RBAC to the backend.

**Middlewares** (`src/middlewares/`):

* `validate.ts` — generic Zod middleware, responds 400 with `{ errors: fieldErrors }` on failure
* `auth.ts` — `isAuthenticated`: reads `Authorization: Bearer <token>`, verifies JWT, checks revocation list, attaches `req.user = { id, role, jti }`. Export `AuthRequest` interface extending Express `Request`.
* `role.ts` — `requireRole(...roles)`: 403 if `req.user.role` not in the allowed list

**Auth domain** (`src/domain/auth/`):

* `auth.schema.ts` — Zod schema for login (email + password)
* `auth.service.ts` — `login` (bcrypt verify + JWT sign with jti from `crypto.randomUUID()`), `revoke` (persist jti), `isRevoked` (lookup), `verify` (jwt.verify wrapped in try/catch). JWT secret from env with `'changeme'` fallback, 12h expiry.
* `auth.routes.ts` — `POST /login` (public) and `POST /revoke` (requires `isAuthenticated`, returns 204)

Apply `requireRole('manager')` individually on each user route except `GET /me`, which should be accessible to any authenticated user regardless of role.

**Result**

* JWT-based authentication with token verification
* Token revocation mechanism using JTI
* Role-based authorization via reusable middleware
* Secure user access patterns (e.g., `/me` accessible to all authenticated users)
* Consistent validation layer integrated with request handling

**Notes**

The implementation required small refinements to ensure correct middleware composition and type safety (`AuthRequest`). The revocation check was kept simple and aligned with the file-based persistence approach.

---

## Prompt 4 — Integration Tests

**Objective**

Ensure API reliability and correctness through integration tests while keeping tests isolated from the filesystem.

**Prompt**

Write integration tests for the auth and users domains using Jest + supertest. Mock `src/services/collections` entirely — no test should touch the filesystem.

For tokens, sign real JWTs using the same secret (`process.env.JWT_SECRET!`) so they pass through the actual `isAuthenticated` middleware. Use `bcrypt.hashSync` with `saltRounds = 1` in mock data for speed.

Cover:

* **Auth routes**: login validation (400), invalid credentials (401), successful login returns token, revoke returns 204 and persists jti
* **User routes — guards**: every manager-only route (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`) must return 401 without token and 403 with a client token. Use `describe.each` to avoid repeating this for each route.
* **User routes — /me**: must return 200 for both `manager` and `client` roles, 401 without token
* **User routes — happy path**: standard CRUD assertions (200/201/204, no password in response, 404 when not found, 400 on schema violations)

Watch out: `isAuthenticated` calls `db.get('revoked-tokens', ...)` on every request. Any test that also mocks `db.get` for another collection needs to use `mockImplementation` and branch by the index argument.

**Result**

* Comprehensive integration test suite covering auth and user flows
* Middleware behavior validated (authentication and authorization)
* Realistic token handling using actual JWT signing
* Fully isolated tests via mocked persistence layer

**Notes**

Special care was taken to correctly mock the persistence layer due to shared usage (`revoked-tokens`). Conditional mocking ensured accurate behavior across different test scenarios.
