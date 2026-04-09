# Hypothetical credit card company - Assessment

A simple full-stack application for a hypothetical credit card company.  
The application allows customers to view their recent transactions and allows the backend system to manage transaction states.

---

## Frontend

Built with React (Next.js 16.2.3), Tailwind CSS, ShadCN UI, and React Query.

### Customer Interface
- Transaction List: Displays a list of transactions (date, merchant name, amount, status)
- Status Filter: Filter transactions by status (e.g., Posted, Pending, Reversed)
- Simple UI: Clean and responsive design

### Manager Interface
- Similar to the customer view, but displays all transactions instead of being scoped to a single user
- Allows updating transaction states

---

## Backend

API built with Express.js, using JSON file-based persistence (as required), with a custom service layer for data management and API documentation generated via Swagger.

### Business Rules

#### Authentication

| Endpoint | Access | Description |
| --- | --- | --- |
| `POST /api/auth/register` | Public | Creates a new user with role `client`. Returns `409` if the email is already taken. Requires `name`, `email`, `password`, and `confirm_password` (passwords must match; minimum 6 characters). |
| `POST /api/auth/login` | Public | Validates credentials and returns a signed JWT (12-hour expiry). Returns `401` on invalid credentials. |
| `POST /api/auth/revoke` | Authenticated | Invalidates the current token via its `jti` claim (stateful revocation). Subsequent requests with the same token are rejected with `401`. |

JWT payload structure: `{ sub: userId, role, jti }`.

#### Users

Two roles exist: `manager` and `client`.

- Passwords are hashed with bcrypt (10 salt rounds) and never returned in any response.
- Self-registration always assigns the `client` role. Only managers can create users with an explicit role.
- The `GET /api/users/me` endpoint is available to any authenticated user. All other user management endpoints (`list`, `get by id`, `create`, `update`, `delete`) require the `manager` role.
- On update, at least one field must be provided; omitting all fields returns `400`.

#### Transactions

**Status lifecycle:** `pending` → `posted` → `reversed`

| Rule | Detail |
| --- | --- |
| Card data is never persisted | `card_number`, `cvv`, and `due_date` are validated and discarded. Only a tokenized `card_id` (`tok_<uuid>`) and `last_digits` are stored. |
| New transactions start as `pending` | After ~8 seconds the status automatically transitions to `posted`, emulating a payment gateway postback. A WebSocket event `transaction-update-<id>` notifies connected clients. |
| Only `posted` transactions can be reversed | Attempting to reverse a `pending` or already `reversed` transaction returns `400`. |
| Reversal requires the `manager` role | `POST /api/transactions/:id/reverse` returns `403` for `client` users. |
| Clients see only their own transactions | `GET /api/transactions` scopes results to the authenticated user. Managers see all transactions and may filter by `?user_id=`. |

**Card validation rules (applied at request time, not stored):**

- `card_number`: exactly 16 digits, must pass the Luhn checksum.
- `cvv`: exactly 3 digits.
- `due_date`: `MM/YYYY` format, must not be expired.
- `amount`: positive number.
- `holder`: non-empty string.

### Features

- Retrieve Transactions: Fetch all transactions for a single user/account
- Create Transaction: Create a new transaction (simulating a purchase)
- Reverse Transaction: Update an existing transaction's status to "Reversed"

### Code Quality
- Clean, well-structured, and readable code
- Clear separation of concerns
- API routes separated from business logic
- Organized using a service/domain-based architecture

### File Organization

```text
src/
├── app.ts                   # Express instance: middleware, swagger, routes mount
├── index.ts                 # Server entry point (listen)
├── swagger.ts               # swagger-jsdoc spec (bearerAuth, servers, api globs)
│
├── routes/
│   └── index.ts             # Route aggregator — mounts domain routers, applies global middleware
│
├── domain/                  # One folder per business domain
│   └── <domain>/
│       ├── <domain>.model.ts       # Raw data access — no business logic
│       ├── <domain>.schema.ts      # Zod schemas and inferred types
│       ├── <domain>.service.ts     # Business logic, calls model
│       ├── <domain>.routes.ts      # Express router with inline Swagger JSDoc
│       └── <domain>.routes.test.ts # Integration tests, co-located with routes
│
├── middlewares/
│   ├── auth.ts              # isAuthenticated — JWT verification + revocation check
│   ├── role.ts              # requireRole(...roles) — RBAC guard
│   └── validate.ts          # validate(schema) — Zod request body validation
│
├── collections.ts        # File-based JSON persistence (assessment only)
│
└── data/                    # Auto-created JSON files, one per collection
    └── <collection>.json
```

Layers only communicate downward: routes → service → model. Middlewares are applied at two levels — globally per prefix in `routes/index.ts` (e.g. `isAuthenticated`), and individually per route in the domain router (e.g. `requireRole`, `validate`). This keeps the aggregator clean and allows per-route access rule overrides within the same domain.

---

## Getting Started

**Requirements:** Node.js v20+

### Run the backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Available at <http://localhost:3001>  
Swagger docs at <http://localhost:3001/api-docs>

### Test accounts

| Role    | Email                      | Password |
| ------- | -------------------------- | -------- |
| Manager | manager@neofinancial.com   | password |
| Client  | client@neofinancial.com    | password |

### Run the frontend

> Copy `.env.local.example` to `.env.local` before running. This file is ignored by git and must not be committed.

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Available at <http://localhost:3000>

---

## AI Usage

AI tools were used to accelerate development and improve productivity during this assessment. All generated outputs were reviewed, adapted, and aligned with the project requirements.

A dedicated `PROMPTS.md` file is included, containing the core prompts used during development (primarily with Claude). The file is organized into sections:

- `## Prompt (name)`: describing the original prompt used
- `## Result`: summarizing the outcome and how it was applied in the project

Only the most relevant prompts were included to highlight key decisions around architecture, data persistence, and business logic implementation.