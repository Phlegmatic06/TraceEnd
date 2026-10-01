# TraceEnd

**Personal Attack Surface Management & Digital Security Remediation Platform**

Discover your exposure. Understand the risk. Fix it. Verify it.

---

## Overview

TraceEnd is a security platform that helps individuals manage their digital attack surface. It discovers security issues across emails, domains, websites, repositories, and other digital assets, then provides structured remediation guidance to resolve them.

### Core workflow

**Discover → Analyze → Prioritize → Explain → Fix → Verify → Monitor**

Every finding includes:
- Plain-English explanation of the issue
- Technical evidence
- Severity and potential impact
- Step-by-step remediation instructions
- Verification procedures

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS 4 |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Validation | Zod |
| Icons | Lucide React |

---

## Project Structure

```
traceend/
├── prisma/
│   ├── schema.prisma          # Database schema (all domain entities)
│   ├── seed.ts                # Development seed data
│   └── migrations/            # Database migrations
├── prisma.config.ts           # Prisma 7 configuration
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # Landing page
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Design system & global styles
│   │   ├── (app)/             # Protected application routes
│   │   │   ├── layout.tsx     # App shell (sidebar + content)
│   │   │   ├── dashboard/     # Security overview
│   │   │   ├── findings/      # Findings list + detail
│   │   │   ├── assets/        # Asset management
│   │   │   ├── scans/         # Scan history
│   │   │   ├── activity/      # Audit timeline
│   │   │   └── settings/      # Configuration
│   │   └── api/               # API routes
│   │       ├── assets/        # Asset CRUD
│   │       └── findings/      # Finding status updates
│   ├── components/
│   │   ├── ui/                # Design system primitives
│   │   ├── layout/            # Sidebar, header
│   │   ├── findings/          # Finding-specific components
│   │   └── assets/            # Asset-specific components
│   └── lib/
│       ├── config/            # Environment validation
│       ├── db/                # Prisma client singleton
│       ├── errors/            # Standardized error types
│       ├── logger/            # Structured logging
│       ├── scanners/          # Scanner interface & registry
│       ├── services/          # Business logic layer
│       ├── types/             # Shared type definitions
│       └── validators/        # Zod schemas
├── tests/                     # Test files
└── docs/                      # Additional documentation
```

---

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm

### 1. Clone and install

```bash
git clone <repository-url>
cd traceend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database connection string
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_APP_URL` — Application URL (default: http://localhost:3000)

### 3. Set up database

```bash
# Push schema to database
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed development data
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create and apply migrations |
| `npm run db:seed` | Seed development data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset database and re-seed |
| `npm test` | Run tests |

---

## Architecture

### Domain Model

The database is designed around real cybersecurity entities:

- **User** — Account and authentication
- **Workspace** — Organizational boundary for assets and findings
- **Asset** — Something being monitored (email, domain, repo, etc.)
- **Scan** — A security scan execution
- **ScanJob** — Individual work units within a scan
- **Finding** — A detected security issue
- **Remediation** — Environment-specific fix instructions
- **RemediationStep** — Individual remediation actions
- **ActivityEvent** — Audit trail
- **Integration** — External service connections
- **NotificationPreference** — Alert configuration

### Service Layer

Business logic is separated from UI components:

```
src/lib/services/
├── findings.ts    # Finding queries, status management, summaries
├── assets.ts      # Asset CRUD, duplicate detection
├── scans.ts       # Scan creation, job dispatching
├── activity.ts    # Audit event queries
└── workspace.ts   # Workspace resolution
```

### Scanner Architecture

Scanners implement a common interface defined in `src/lib/scanners/types.ts`:

```typescript
interface Scanner {
  id: string;
  name: string;
  supportedAssetTypes: AssetType[];
  execute(identifier: string, type: AssetType, config?: Record<string, unknown>): Promise<ScannerResult>;
}
```

Future scanning workflow:

```
User starts scan
  → API creates Scan record
  → Scan creates ScanJobs
  → Job queue receives ScanJobs
  → Scanner workers process jobs
  → Findings are normalized
  → Risk engine evaluates findings
  → Remediations attached
  → Dashboard updated
```

The `ScannerRegistry` in `src/lib/scanners/types.ts` supports dynamic scanner registration, allowing new scanners to be added without modifying existing code.

### Future Infrastructure

The architecture is designed to integrate with:

- **Redis + BullMQ** — Job queue for scan workers
- **Containerized workers** — Independent scanner processes
- **Object storage** — Image/file uploads
- **GitHub OAuth** — Authentication and repository access
- **Webhooks** — Inbound event processing
- **Scheduled scans** — Cron-based recurring assessments

---

## Design System

### Visual principles

- Sharp corners (minimal border-radius)
- Restrained professional palette (grays, no gradients)
- Information-dense layouts
- Severity colors used semantically (red, orange, amber, gray, green)
- Inter font for UI, JetBrains Mono for technical values
- Minimal transitions (respects prefers-reduced-motion)

### Component library

Located in `src/components/ui/`:

- `Badge` — Status and category labels
- `Button` — Action buttons with variants
- `SeverityBadge` / `SeverityIndicator` — Semantic severity display
- `EmptyState` — Professional empty state messaging
- `TableSkeleton` / `PageSkeleton` — Loading states

---

## Security Practices

- HTTP security headers (X-Content-Type-Options, X-Frame-Options, CSP basics)
- Server-side input validation with Zod
- Parameterized database access through Prisma ORM
- No secrets in source control (.env in .gitignore)
- Environment variable validation at startup
- Standardized error responses (never expose internal details)
- Structured logging (no random console.log)
- Ownership validation on all data access

**Note on Dependencies (`npm audit`)**:
- Prisma 7.10.0 currently pulls transitive advisories through `@prisma/config`.
- TraceEnd uses PostgreSQL via `@prisma/adapter-pg` and does not use `mysql2` at runtime.
- `deepmerge-ts` is used by Prisma tooling/config processing, not exposed through the application runtime.
- These advisories will be re-evaluated when a stable Prisma release resolves them.

---

## Product Principles

1. **Evidence before claims** — Findings must originate from deterministic scanners, not AI speculation
2. **Explain without oversimplifying** — Both plain-English and technical views
3. **Action over fear** — Remediation guidance, not fear-based warnings
4. **Historical ≠ current** — Distinguish between past exposure and active vulnerability
5. **User authorization** — Only scan assets the user owns or is authorized to assess

---

## License

Proprietary. All rights reserved.
