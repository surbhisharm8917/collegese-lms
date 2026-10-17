#!/bin/sh
set -eu

export API_URL="${API_URL:-}"
export RELEASE="${RELEASE:-unknown}"
export COMPANY_LEGAL_NAME="${COMPANY_LEGAL_NAME:-Just Easy CA Classes Private Limited}"
export LEGAL_ADDRESS="${LEGAL_ADDRESS:-}"
export SUPPORT_EMAIL="${SUPPORT_EMAIL:-hello@justeasycaclasses.com}"
export SUPPORT_PHONE="${SUPPORT_PHONE:-+91 8894357155}"
export GRIEVANCE_OFFICER_NAME="${GRIEVANCE_OFFICER_NAME:-}"
export GRIEVANCE_EMAIL="${GRIEVANCE_EMAIL:-$SUPPORT_EMAIL}"
export CIN="${CIN:-}"
export GSTIN="${GSTIN:-}"

if [ "${REQUIRE_LEGAL_CONFIG:-false}" = "true" ]; then
  for required_value in "$LEGAL_ADDRESS" "$GRIEVANCE_OFFICER_NAME" "$GRIEVANCE_EMAIL"; do
    if [ -z "$required_value" ]; then
      echo "Required production legal configuration is missing." >&2
      exit 1
    fi
  done
fi

jq -cn \
  --arg apiUrl "$API_URL" \
  --arg release "$RELEASE" \
  --arg companyLegalName "$COMPANY_LEGAL_NAME" \
  --arg legalAddress "$LEGAL_ADDRESS" \
  --arg supportEmail "$SUPPORT_EMAIL" \
  --arg supportPhone "$SUPPORT_PHONE" \
  --arg grievanceOfficerName "$GRIEVANCE_OFFICER_NAME" \
  --arg grievanceEmail "$GRIEVANCE_EMAIL" \
  --arg cin "$CIN" \
  --arg gstin "$GSTIN" \
  '{API_URL:$apiUrl,RELEASE:$release,COMPANY_LEGAL_NAME:$companyLegalName,LEGAL_ADDRESS:$legalAddress,SUPPORT_EMAIL:$supportEmail,SUPPORT_PHONE:$supportPhone,GRIEVANCE_OFFICER_NAME:$grievanceOfficerName,GRIEVANCE_EMAIL:$grievanceEmail,CIN:$cin,GSTIN:$gstin}' \
  | sed 's/^/window.__JECC_CONFIG__ = /; $s/$/;/' \
  > /usr/share/nginx/html/runtime-config.js

exec "$@"
