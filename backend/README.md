# Just Easy CA Classes API

Express 5 and Prisma API for authentication, RBAC, courses, direct cloud uploads, LiveKit classrooms, assessments, quizzes, exams, certificates, support requests, analytics, exports, email, and maintenance controls.

```bash
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
pnpm dev
```

Production uses PostgreSQL, `STORAGE_DRIVER=azure|s3`, HTTPS application/API URLs, SMTP, and LiveKit. The process validates all required configuration before listening. Migrations run from the production container entrypoint; readiness verifies database, storage, and LiveKit dependencies.

Useful commands:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --prod --audit-level high
```

Use migrations for schema changes. Do not run `prisma db push` against shared or production databases.
