#!/usr/bin/env python3
import os
import pathlib
import subprocess
import sys

repo = pathlib.Path(__file__).resolve().parents[1]
values = {}
for raw in (repo / "backend/.env").read_text().splitlines():
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    values[key.strip()] = value.strip().strip('"').strip("'")

mapped = {
    "TF_VAR_aws_region": "ap-south-1",
    "TF_VAR_environment": "production",
    "TF_VAR_name_prefix": "edusprouts-justeasy",
    "TF_VAR_backend_image": "064123637786.dkr.ecr.ap-south-1.amazonaws.com/edusprouts-justeasy-backend:release-20260821-0605",
    "TF_VAR_frontend_image": "064123637786.dkr.ecr.ap-south-1.amazonaws.com/edusprouts-justeasy-frontend:release-20260821-0605",
    # Resend's HTTPS API is the primary transport. The SMTP variables below only
    # feed the nodemailer fallback, so they default to Resend's SMTP bridge
    # (username "resend", password = the same API key) rather than Gmail.
    "TF_VAR_email_host": os.environ.get("TF_VAR_email_host") or values.get("EMAIL_HOST") or "smtp.resend.com",
    "TF_VAR_email_port": os.environ.get("TF_VAR_email_port") or values.get("EMAIL_PORT") or "587",
    "TF_VAR_email_user": os.environ.get("TF_VAR_email_user") or values.get("EMAIL_USER") or "resend",
    "TF_VAR_email_from": os.environ.get("TF_VAR_email_from") or values.get("EMAIL_FROM") or values.get("SUPPORT_EMAIL") or "hello@justeasycaclasses.com",
    "TF_VAR_email_password": os.environ.get("TF_VAR_email_password")
    or values.get("EMAIL_PASS")
    or values.get("RESEND_API_KEY")
    or "",
    "TF_VAR_resend_api_key": os.environ.get("TF_VAR_resend_api_key") or values.get("RESEND_API_KEY") or "",
    # MUST be on the domain verified in Resend, otherwise every send returns 403.
    "TF_VAR_resend_from_email": os.environ.get("TF_VAR_resend_from_email")
    or values.get("RESEND_FROM_EMAIL")
    or "no-reply@justeasy.in",
    "TF_VAR_resend_from_name": values.get("RESEND_FROM_NAME") or "Just Easy CA Classes",
    "TF_VAR_send_verification_emails": "true",
    # Hides the optional "email me a code" route on the sign-in screen: the demo
    # accounts on @justeasy.in have no reachable mailbox, so offering it there
    # would only lead to a dead end. Password sign-in and registration codes are
    # unaffected by this flag.
    "TF_VAR_login_otp_enabled": os.environ.get("TF_VAR_login_otp_enabled") or "false",
    "TF_VAR_support_email": values.get("SUPPORT_EMAIL", "hello@justeasycaclasses.com"),
    "TF_VAR_support_phone": values.get("SUPPORT_PHONE", "+91 8894357155"),
    "TF_VAR_grievance_email": os.environ.get("TF_VAR_grievance_email") or values.get("GRIEVANCE_EMAIL") or "hello@justeasycaclasses.com",
    "TF_VAR_livekit_api_url": values.get("LIVEKIT_API_URL", "") if values.get("LIVEKIT_API_URL", "").startswith("https://") else "https://collegese-livekit.mangosmoke-5ac96b4e.centralindia.azurecontainerapps.io",
    "TF_VAR_livekit_ws_url": values.get("LIVEKIT_WS_URL", "") if values.get("LIVEKIT_WS_URL", "").startswith("wss://") else "wss://collegese-livekit.mangosmoke-5ac96b4e.centralindia.azurecontainerapps.io",
    "TF_VAR_livekit_api_key": values.get("LIVEKIT_API_KEY", ""),
    "TF_VAR_livekit_api_secret": values.get("LIVEKIT_API_SECRET", ""),
    "TF_VAR_allow_incomplete_legal_config": "true",
    "TF_VAR_alert_email": values.get("ALERT_EMAIL", ""),
    "TF_VAR_release": "release-20260821-0605",
    "TF_VAR_custom_domain": "justeasy.in",
    "TF_VAR_additional_custom_domains": '["www.justeasy.in"]',
    "TF_VAR_cloudfront_certificate_arn": "arn:aws:acm:us-east-1:064123637786:certificate/3a08ee73-0743-4c4b-9663-2da5d6051915",
}
env = os.environ.copy()
env.update(mapped)
env["AWS_PROFILE"] = "edusprouts"
env.pop("AWS_ACCESS_KEY_ID", None)
env.pop("AWS_SECRET_ACCESS_KEY", None)
result = subprocess.run(["terraform", *sys.argv[1:]], cwd=repo / "infra/terraform/aws", env=env)
sys.exit(result.returncode)
