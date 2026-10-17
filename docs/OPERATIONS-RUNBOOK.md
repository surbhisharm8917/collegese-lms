# Operations Runbook

## Routine Checks

- Confirm frontend `/healthz` and backend `/health/ready` are green.
- Review failed requests, authentication throttles, container restarts, database CPU/storage, mail failures, and LiveKit webhook failures.
- Review open support and privacy requests daily.
- Confirm cloud backups and storage versioning weekly.
- Run a staging restore drill at least quarterly and before a provider migration.

## Release And Rollback

Deploy only through the GitHub `Deploy` workflow. Images are identified by Git SHA. Azure waits for Container Apps probes; AWS uses the ECS deployment circuit breaker. The workflow runs smoke tests and reapplies the prior backend/frontend image pair if validation fails.

If manual rollback is necessary, rerun `Deploy` from the last known-good commit. Do not use mutable `latest` tags and do not edit a production container by hand.

## PostgreSQL Backup And Restore

Cloud point-in-time retention is 35 days by default. The release workflow also requests a provider snapshot before an existing database is migrated.

Create a portable logical backup:

```bash
scripts/backup-postgres.sh "$DATABASE_URL" "backups/jecc-$(date +%Y%m%d-%H%M).dump"
```

Restore only into an empty staging database first:

```bash
scripts/restore-postgres.sh "$DESTINATION_DATABASE_URL" backups/jecc-YYYYMMDD-HHMM.dump
pnpm --dir backend db:migrate:deploy
```

Verify user, enrollment, course, assessment, exam, certificate, and support-ticket counts before production cutover.

## Storage Migration

Configure authenticated `rclone` remotes for the source and destination, then run:

```bash
scripts/sync-storage.sh azure:private-content s3:destination-private-content
scripts/sync-storage.sh azure:public-assets s3:destination-public-assets
```

The command performs a copy followed by a checksum comparison. Keep source storage read-only until destination playback and signed downloads pass.

## Security Incident

1. Restrict or suspend affected accounts and revoke their sessions.
2. Preserve request IDs, logs, database audit evidence, and relevant support references.
3. Rotate the affected credential in Key Vault or Secrets Manager, then redeploy.
4. For an authentication-signing secret rotation, expect all users to sign in again.
5. Assess personal-data impact, legal notification duties, and user communication with the designated privacy contact.
6. Record scope, timeline, decisions, remediation, and follow-up tests.

Never paste database URLs, SMTP keys, storage keys, JWT secrets, LiveKit secrets, or access tokens into tickets, chat, logs, or source control.

## Live Classroom Incident

- Check backend readiness first; it verifies LiveKit connectivity.
- Check LiveKit service health, room count, webhook delivery, regional status, and firewall/TURN reachability.
- Teachers can end a room from the classroom. Administrators can remove participants.
- Attendance is finalized from signed, deduplicated LiveKit webhook events.
- If the provider is unavailable, communicate the interruption and reschedule; do not bypass token validation with a public room.

## Data Requests And Grievances

Every request receives a `JECA-YYYYMMDD-XXXXXXXX` reference. Verify requester identity before disclosing, correcting, exporting, or erasing personal data. Record the decision and legal retention reason when full erasure is not possible. Consumer grievances target acknowledgment within 48 hours and resolution within one month.
