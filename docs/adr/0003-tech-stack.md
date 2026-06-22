# 0003 — Tech Stack

Date: 2026-06-22
Status: Accepted

## Context

Phase 1 (Requirements) is complete. Before implementation begins, the full technology
stack must be chosen and recorded. Key constraints:

- All application infrastructure runs on AWS Free Tier (see ADR 0001, CLAUDE.md).
- The frontend must be a static site (deployable to S3 + CloudFront) — no SSR.
- The backend runs on AWS Lambda (Node.js runtime).
- The sole developer is learning-oriented and wants choices that are long-term valid
  and widely used in the industry.
- A single `prod` environment is sufficient for the MVP.

This ADR closes open question OQ-05 from `docs/requirements/requirements.md`.

---

## Decisions

### Frontend

**React 19 + TypeScript + Vite**

React is the most widely used frontend library and the dominant skill in the frontend
job market. TypeScript is table-stakes for any modern project. Vite produces a fully
static output (`dist/`) with no server process, so deployment is `aws s3 sync dist/
s3://peakhq-frontend`. No SSR involved.

**shadcn/ui + Tailwind CSS v4**

shadcn/ui provides production-quality accessible components (built on Radix UI
primitives) that are copied into the project source — no black-box dependency, fully
customisable. Tailwind v4 is the current release with a CSS-first configuration model
(no `tailwind.config.js`).

**TanStack Query v5**

Server-state caching, background re-fetching, and optimistic updates without a global
store. The standard choice for data fetching in React applications.

**React Hook Form + Zod**

Performant form state management with field-level validation. Zod schemas are shared
between frontend and backend (request validation), ensuring the same type definitions
are used throughout the monorepo.

**React Router v7 (library mode)**

Client-side routing for the SPA. Library mode (not framework mode) keeps the
deployment model as a plain static site — no server adapter needed.

**Recharts**

Composable, well-documented charting library for the exercise progression view and
body weight trend chart.

---

### Backend

**Node.js 22 LTS + TypeScript**

Node.js 22 is the current AWS Lambda LTS runtime. Using TypeScript end-to-end (CDK,
backend, frontend) means one language, one toolchain, and shared Zod schemas across
the monorepo. There is no context-switching between languages.

**AWS Lambda Powertools for TypeScript**

Structured JSON logging, AWS X-Ray tracing, and a middleware pattern without the
weight of a full HTTP framework. Lambda routing is handled at the API Gateway level;
a framework like Express adds cold-start latency for no benefit.

**CDK `NodejsFunction` construct**

Bundles each Lambda handler with esbuild at CDK synth time. The resulting bundle is
minimal and Lambda cold starts stay under 100 ms at 128 MB memory.

---

### API Layer

**API Gateway HTTP API v2 + JWT authorizer**

HTTP API v2 is lower-latency and lower-cost than REST API v1 (roughly 1/4 the price).
JWT authorizers validate Cognito tokens against the Cognito JWKS endpoint natively,
eliminating auth code from Lambda handlers entirely.

**CloudFront routing split**

All paths under `/api/*` are forwarded by CloudFront to the API Gateway URL. All
other paths serve the S3 bucket via Origin Access Control. The browser always
communicates with a single CloudFront domain — no cross-origin complexity.

---

### Authentication

**Cognito User Pool + Hosted UI (PKCE flow)**

The Hosted UI handles the login page, avoiding the need to build custom auth screens
for the MVP. User self-registration is disabled; the owner's account is the only one.
The frontend uses the Amplify Auth SDK (or `amazon-cognito-identity-js`) to manage
the PKCE exchange, token refresh, and local storage.

---

### Food Database

**Open Food Facts — called directly from the browser**

Open Food Facts is free, requires no API key, and sets `Access-Control-Allow-Origin: *`.
Calling it directly from the browser eliminates Lambda invocations and latency from
the food search hot path. A Lambda proxy is the documented fallback if CORS issues
arise in production.

---

### Database

**DynamoDB single-table design, on-demand (PAY_PER_REQUEST)**

On-demand mode avoids capacity planning and throttling during burst (e.g., opening
the app after several days). It is free for the first 25 million read and 25 million
write requests per month — far above anything a single-user MVP will generate.
Point-in-time recovery is enabled (free for DynamoDB).

One GSI (GSI1) serves the exercise progression query (all sets for one exercise
across all sessions). All other access patterns use `SK begins_with` on the base table.

See `docs/data-model.md` for the full entity key scheme.

---

### Testing

| Scope                               | Framework                       | Why                                                                      |
| ----------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| Frontend + backend unit/integration | Vitest                          | Reuses Vite config, no Babel layer, identical import syntax to app code  |
| CDK infrastructure                  | Jest + `aws-cdk-lib/assertions` | CDK snapshot test docs and examples target Jest; no benefit to switching |
| E2E                                 | Playwright                      | Industry standard, first-class GitHub Actions support                    |

Coverage threshold: 80% line coverage enforced in CI via `vitest run --coverage`.

---

### Monorepo

**npm workspaces** with three workspaces: `frontend/`, `backend/`, `infra/`.

Root `package.json` provides workspace-level scripts (`lint`, `format`, `test`,
`typecheck`) that fan out across workspaces.

- **ESLint v9** (flat config) + `typescript-eslint` for linting.
- **Prettier** for formatting.

---

## Consequences

- The entire codebase (CDK, backend Lambda, frontend) is TypeScript. One language to
  learn and maintain across the project.
- Zod schemas defined once in `backend/src/lib/schemas/` are imported by both the
  backend (request validation) and shared as types with the frontend.
- The free-tier cost target is maintained: S3+CloudFront for static assets, HTTP API
  v2 + Lambda + DynamoDB for the backend, Cognito for auth — all within Free Tier
  limits for single-user personal use.
- Phase 3 implementation starts with `infra/` (CDK stacks), then `backend/` (Lambda
  handlers with tests), then `frontend/` (React components with tests).
