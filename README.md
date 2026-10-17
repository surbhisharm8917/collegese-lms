# Just Easy CA Classes

Production-oriented learning management platform for CA and commerce education. It supports students, teachers, assistants, administrators, and super administrators across courses, live classes, recorded video, assessments, quizzes, examinations, certificates, progress analytics, support requests, and exports.

## Platform

| Area | Implementation |
| --- | --- |
| Web | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide |
| API | Node.js 22, Express 5, TypeScript, Prisma |
| Data | PostgreSQL 16 |
| Live classes | LiveKit SFU with role-scoped tokens and signed webhooks |
| Files | Direct browser upload to Azure Blob, AWS S3, or local development storage |
| Authentication | HTTP-only cookies, database-backed sessions, CSRF, email verification, RBAC |
| Deployment | Docker, Terraform, GitHub Actions, Azure Container Apps, AWS ECS Fargate |

## Local Development

Requirements: Node.js 22, pnpm 10, Docker, and PostgreSQL 16.

```bash
pnpm setup
pnpm infra:local:up
pnpm --dir backend db:migrate:deploy
pnpm dev
```

The frontend runs at `http://127.0.0.1:5173`, the API at `http://127.0.0.1:4000`, and LiveKit at `ws://127.0.0.1:7880`. Copy the root [`.env.example`](.env.example) to `backend/.env` and replace all local placeholders first.

## Quality Gates

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --dir backend audit --prod --audit-level high
pnpm --dir frontend audit --prod --audit-level high
```

The integration suite uses a real PostgreSQL database and optionally a real local LiveKit server. Production containers expose `/health/ready` and `/healthz` probes.

## Deployment

The `Deploy` GitHub workflow builds one immutable backend/frontend image pair and deploys it to either Azure or AWS. Terraform maintains equivalent security, database, storage, backup, autoscaling, monitoring, and rollback contracts on both providers.

See [DEPLOYMENT.md](DEPLOYMENT.md) for cloud setup and [the operations runbook](docs/OPERATIONS-RUNBOOK.md) for backup, restore, incident, and rollback procedures.

## Repository Layout

```text
backend/                   Express API, Prisma schema and migrations
frontend/                  React application and runtime configuration
infra/terraform/azure/     Azure production stack
infra/terraform/aws/       AWS production stack
infra/livekit/             Local LiveKit configuration
scripts/                   Setup, smoke, backup, restore and migration tools
.github/workflows/         CI, immutable deployment and image retention
```

Do not use `prisma db push`, local filesystem storage, demo users, static cloud access keys, or mutable image tags in production.
