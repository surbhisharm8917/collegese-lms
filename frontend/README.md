# Just Easy CA Classes Web

React 19 application for public CA resources, account access, role dashboards, direct file upload, LiveKit classrooms, assessments, exams, certificates, and grievance tracking.

```bash
pnpm install
pnpm dev
```

Production configuration is injected when the Nginx container starts through `/runtime-config.js`; the image is identical on Azure and AWS. `API_URL`, release identity, company legal details, and support contacts are runtime values rather than build-time provider settings.

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm audit --prod --audit-level high
```
