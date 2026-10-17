# Production Deployment

The same application images run on Azure and AWS. Azure is the primary target; AWS is the tested portability target. LiveKit is intentionally external to either application stack so the classroom endpoint does not change during a cloud migration.

## Architecture Contracts

| Capability  | Azure                                  | AWS                                                |
| ----------- | -------------------------------------- | -------------------------------------------------- |
| Application | Container Apps, two or more replicas   | ECS Fargate, two or more tasks                     |
| Database    | Private PostgreSQL Flexible Server, HA | Private RDS PostgreSQL, Multi-AZ                   |
| Files       | Versioned Blob containers with SAS     | Versioned S3 buckets with presigned URLs           |
| Secrets     | Key Vault references                   | Secrets Manager task injection                     |
| Edge/TLS    | Container Apps managed HTTPS           | CloudFront managed HTTPS and protected ALB origin  |
| Logs/alerts | Log Analytics and Azure Monitor        | CloudWatch and SNS                                 |
| Rollback    | Previous immutable images reapplied    | ECS circuit breaker plus previous images reapplied |

## External Production Inputs

Create environment-scoped `staging` and `production` settings in GitHub. The workflow refuses a production release without the legal address and grievance officer.

Repository secrets:

- `GHCR_READ_TOKEN`: fine-grained token with read access to the two container packages.
- `RESEND_API_KEY`: Resend API key for transactional email; this is the primary transport.
- `EMAIL_PASSWORD`: verified SMTP credential, now only for the optional SMTP fallback.
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`: production LiveKit project credentials.
- Azure: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` for an OIDC federated deployment identity.
- AWS: `AWS_DEPLOY_ROLE_ARN` for a GitHub OIDC deployment role.

Repository variables:

- `GHCR_USERNAME`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`.
- `RESEND_FROM_EMAIL` must be an address on the domain verified in Resend; `RESEND_FROM_NAME` is the display name.
- `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `GRIEVANCE_EMAIL`, `ALERT_EMAIL`.
- `LIVEKIT_API_URL` and `LIVEKIT_WS_URL` using `https://` and `wss://`.
- `COMPANY_LEGAL_NAME`, `LEGAL_ADDRESS`, `GRIEVANCE_OFFICER_NAME`, `CIN`, `GSTIN`.
- Azure state: `AZURE_TF_STATE_RESOURCE_GROUP`, `AZURE_TF_STATE_ACCOUNT`, `AZURE_LOCATION`.
- AWS state: `AWS_TF_STATE_BUCKET`, `AWS_REGION`.

The OIDC identities need permission to create and manage the resources in their Terraform stack. No long-lived Azure or AWS access key is required by the application.

## Release

1. Merge a verified commit into `main`.
2. Open GitHub Actions and run `Deploy`.
3. Select `azure` or `aws` and `staging` or `production`.
4. For production, type `DEPLOY` in the confirmation field.

The workflow then runs all quality gates, pushes SHA-tagged images, bootstraps encrypted remote Terraform state, snapshots an existing database, applies Terraform, waits for readiness, checks runtime configuration, headers, CSRF, CORS, storage, database, and LiveKit health, and restores the previous images if smoke validation fails.

## Azure CLI Deployment

Use this path for first-time Azure bootstrap, staging rehearsals, or a manual production release when GitHub Actions is unavailable. It uses Azure CLI for authentication, provider registration, and encrypted Terraform state; Terraform still owns the application stack.

Install or update the required tools:

```bash
az upgrade
az extension add --name containerapp --upgrade
terraform version
docker buildx version
node --version
pnpm --version
```

Log in and register the Azure resource providers used by the platform:

```bash
export AZURE_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
export AZURE_TENANT_ID="00000000-0000-0000-0000-000000000000"
export AZURE_LOCATION="centralindia"

az login --tenant "$AZURE_TENANT_ID"
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

for provider in Microsoft.App Microsoft.ContainerRegistry Microsoft.DBforPostgreSQL Microsoft.KeyVault Microsoft.Network Microsoft.OperationalInsights Microsoft.Storage; do
	az provider register --namespace "$provider"
done
```

Run local quality gates before publishing images:

```bash
pnpm install:all
pnpm --dir backend db:generate
pnpm typecheck
pnpm lint
pnpm test
pnpm --dir backend audit --prod --audit-level high
pnpm --dir frontend audit --prod --audit-level high
pnpm build
```

Build, scan, and push immutable GHCR images. Use a GitHub token that can write packages for the push and can read packages during Container Apps pull.

```bash
export GHCR_USERNAME="github-user-or-org"
export GHCR_TOKEN="github-token-with-package-access"
export GHCR_OWNER="github-owner"
export RELEASE_SHA="$(git rev-parse HEAD)"
export BACKEND_IMAGE="ghcr.io/${GHCR_OWNER}/just-easy-ca-backend:${RELEASE_SHA}"
export FRONTEND_IMAGE="ghcr.io/${GHCR_OWNER}/just-easy-ca-frontend:${RELEASE_SHA}"

printf '%s' "$GHCR_TOKEN" | docker login ghcr.io --username "$GHCR_USERNAME" --password-stdin
docker buildx build --platform linux/amd64 --tag "$BACKEND_IMAGE" --load backend
docker buildx build --platform linux/amd64 --tag "$FRONTEND_IMAGE" --load frontend

for image in "$BACKEND_IMAGE" "$FRONTEND_IMAGE"; do
	docker run --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy:0.72.0 image \
		--scanners vuln \
		--severity HIGH,CRITICAL \
		--ignore-unfixed \
		--exit-code 1 \
		"$image"
done

docker push "$BACKEND_IMAGE"
docker push "$FRONTEND_IMAGE"
```

Export Terraform inputs from the same shell session. Keep secrets in environment variables or a secure shell secret manager, not in committed `.tfvars` files.

```bash
export TF_VAR_azure_subscription_id="$AZURE_SUBSCRIPTION_ID"
export TF_VAR_environment="staging"
export TF_VAR_backend_image="$BACKEND_IMAGE"
export TF_VAR_frontend_image="$FRONTEND_IMAGE"
export TF_VAR_registry_username="$GHCR_USERNAME"
export TF_VAR_registry_password="$GHCR_TOKEN"

export TF_VAR_email_host="smtp.example.com"
export TF_VAR_email_port="587"
export TF_VAR_email_user="notifications@example.com"
export TF_VAR_email_password="smtp-password"
export TF_VAR_resend_api_key="re_replace-me"
export TF_VAR_resend_from_email="no-reply@justeasycaclasses.com"
export TF_VAR_resend_from_name="Just Easy CA Classes"
export TF_VAR_support_email="hello@justeasycaclasses.com"
export TF_VAR_support_phone="+91 8894357155"
export TF_VAR_grievance_email="grievance@justeasycaclasses.com"

export TF_VAR_livekit_api_url="https://live.example.com"
export TF_VAR_livekit_ws_url="wss://live.example.com"
export TF_VAR_livekit_api_key="livekit-api-key"
export TF_VAR_livekit_api_secret="livekit-api-secret"

export TF_VAR_company_legal_name="Just Easy CA Classes Private Limited"
export TF_VAR_legal_address="Required before production"
export TF_VAR_grievance_officer_name="Required before production"
export TF_VAR_cin=""
export TF_VAR_gstin=""
export TF_VAR_alert_email="operations@example.com"
export TF_VAR_release="$RELEASE_SHA"
```

Bootstrap encrypted remote Terraform state. The signed-in identity needs Contributor on the subscription or target resource groups, plus Storage Blob Data Contributor on the state account.

```bash
export AZURE_TF_STATE_RESOURCE_GROUP="rg-jecc-tfstate"
export AZURE_TF_STATE_ACCOUNT="stjecctfstate12345"

az group create \
	--name "$AZURE_TF_STATE_RESOURCE_GROUP" \
	--location "$AZURE_LOCATION" \
	--output none

if ! az storage account show --name "$AZURE_TF_STATE_ACCOUNT" --resource-group "$AZURE_TF_STATE_RESOURCE_GROUP" >/dev/null 2>&1; then
	az storage account create \
		--name "$AZURE_TF_STATE_ACCOUNT" \
		--resource-group "$AZURE_TF_STATE_RESOURCE_GROUP" \
		--location "$AZURE_LOCATION" \
		--sku Standard_GRS \
		--min-tls-version TLS1_2 \
		--allow-blob-public-access false \
		--output none
fi

az storage container create \
	--name tfstate \
	--account-name "$AZURE_TF_STATE_ACCOUNT" \
	--auth-mode login \
	--output none
```

Plan and apply the Azure stack:

```bash
terraform -chdir=infra/terraform/azure init -input=false -reconfigure \
	-backend-config="resource_group_name=${AZURE_TF_STATE_RESOURCE_GROUP}" \
	-backend-config="storage_account_name=${AZURE_TF_STATE_ACCOUNT}" \
	-backend-config="container_name=tfstate" \
	-backend-config="key=just-easy-ca/${TF_VAR_environment}.tfstate" \
	-backend-config="use_azuread_auth=true"

terraform -chdir=infra/terraform/azure fmt -check -recursive
terraform -chdir=infra/terraform/azure validate
terraform -chdir=infra/terraform/azure plan -out=tfplan
terraform -chdir=infra/terraform/azure apply tfplan
```

The backend container runs `prisma migrate deploy` at startup and refuses to start if migrations are not packaged. After Terraform completes, validate the deployed platform:

```bash
export APP_URL="$(terraform -chdir=infra/terraform/azure output -raw frontend_url)"
export API_URL="$(terraform -chdir=infra/terraform/azure output -raw api_url)"
export EXPECTED_RELEASE="$RELEASE_SHA"
export RESOURCE_GROUP="$(terraform -chdir=infra/terraform/azure output -raw resource_group_name)"

node scripts/smoke-test.mjs

az containerapp show --resource-group "$RESOURCE_GROUP" --name "jecc-api-${TF_VAR_environment}" --query properties.runningStatus -o tsv
az containerapp show --resource-group "$RESOURCE_GROUP" --name "jecc-web-${TF_VAR_environment}" --query properties.runningStatus -o tsv
```

For production, change `TF_VAR_environment` to `production` only after legal settings, production SMTP, LiveKit, backup retention, DNS, alerting, and rollback have passed in staging.

## Initial Staging

Use the example variables in:

- [`infra/terraform/azure/terraform.tfvars.example`](infra/terraform/azure/terraform.tfvars.example)
- [`infra/terraform/aws/terraform.tfvars.example`](infra/terraform/aws/terraform.tfvars.example)

Local validation:

```bash
terraform -chdir=infra/terraform/azure init -backend=false
terraform -chdir=infra/terraform/azure validate
terraform -chdir=infra/terraform/aws init -backend=false
terraform -chdir=infra/terraform/aws validate
```

## Domain Cutover

Validate the provider URL first. Then map the public application and API domains, update the Terraform URLs/CORS origin if separate domains are used, verify SMTP links, and lower DNS TTL before cutover. Do not remove the old stack until database row counts, object checksums, login, enrollment, video, exam, certificate, support, and LiveKit journeys pass on the destination.

For provider migration, use `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh`, and `scripts/sync-storage.sh`, then run the destination smoke test before changing DNS.
