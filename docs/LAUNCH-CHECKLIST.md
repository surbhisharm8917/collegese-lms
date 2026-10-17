# Launch Checklist

## Required Before Production Traffic

- Company legal name, registered address, grievance officer, contact details, CIN, and GSTIN are confirmed by the company.
- Privacy, terms, refund, and grievance text is reviewed by qualified Indian counsel.
- Production SMTP domain is verified and verification, reset, class, result, certificate, and support emails are delivered.
- Production LiveKit project is configured with signed webhook delivery to `/api/v1/live-lectures/webhook`.
- Azure CLI, Terraform, Docker Buildx, and pnpm are updated on the release workstation; the Azure CLI deployment runbook in [`DEPLOYMENT.md`](../DEPLOYMENT.md) passes for staging.
- Azure and AWS OIDC roles, remote state, GitHub environments, protected approvals, and alert recipients are configured.
- Database and storage credentials previously exposed outside secret management are rotated.
- Production database is private, HA/Multi-AZ, auto-growing, and retained for 35 days.
- Storage is versioned; private learning files cannot be fetched without a short-lived signed URL.
- Two application replicas pass readiness checks and rollback has been rehearsed in staging.
- Every role journey passes with non-production accounts and all pilot data can be removed.
- Restore, provider migration, incident response, and support escalation have named owners.

## External Business Decisions

- Online checkout is not part of this LMS release. If courses will be sold directly online, select a payment provider, complete merchant KYC, and add a separately reviewed checkout/refund reconciliation flow before advertising self-service purchases.
- Decide whether production LiveKit is managed or self-hosted. Managed LiveKit is the lower-operations default; self-hosting requires public UDP/TCP media capacity, TURN, TLS, monitoring, upgrades, and load testing.
- Set the custom application, API, live-class, and email-sender domains.
- Approve course access periods, cancellation rules, minor enrollment process, record retention, and learner support staffing.

## Pilot Exit Criteria

- At least one teacher uploads and plays a full-length video from private storage.
- Two browsers complete a live class with camera, microphone, screen sharing, chat, participant removal, end-room, and attendance finalization.
- A learner completes quiz, assessment, and exam journeys without answer leakage.
- Certificate issue, public verification, revocation, and email delivery pass.
- Backup restore and failed-release rollback complete within the agreed recovery targets.
- Monitoring generates and delivers a test alert.
