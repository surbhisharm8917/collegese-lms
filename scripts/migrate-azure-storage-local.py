#!/usr/bin/env python3
import json
import pathlib
import re
import subprocess
import tempfile

repo = pathlib.Path(__file__).resolve().parents[1]
text = (repo / ".azure-deploy.local.txt").read_text()
values = {m.group(1): m.group(2).strip() for m in re.finditer(r"(?m)^([A-Z][A-Z0-9_]*)=(.*)$", text)}
account = values.get("STORAGE", "stclmsd8bfdf7c")
key = values["STORAGE_KEY"]
targets = {
    "public": "edusprouts-justeasy-production-p1w97w-public-assets",
    "private": "edusprouts-justeasy-production-p1w97w-private-content",
}

with tempfile.TemporaryDirectory(prefix="edusprouts-justeasy-storage-") as temp:
    for container, bucket in targets.items():
        destination = pathlib.Path(temp) / container
        destination.mkdir(parents=True, exist_ok=True)
        download = subprocess.run([
            "az", "storage", "blob", "download-batch", "--account-name", account,
            "--account-key", key, "--source", container, "--destination", str(destination),
            "--no-progress", "--only-show-errors",
        ], capture_output=True, text=True)
        if download.returncode:
            raise SystemExit(f"Azure {container} download failed (credentials omitted): {download.stderr[-300:]}")
        upload = subprocess.run([
            "aws", "s3", "sync", str(destination), f"s3://{bucket}", "--profile", "edusprouts",
            "--region", "ap-south-1", "--only-show-errors",
        ], capture_output=True, text=True)
        if upload.returncode:
            raise SystemExit(f"S3 {container} upload failed: {upload.stderr[-300:]}")
        source = subprocess.run([
            "az", "storage", "blob", "list", "--account-name", account, "--account-key", key,
            "--container-name", container, "--query", "{count:length(@),bytes:sum([].properties.contentLength)}", "-o", "json",
        ], capture_output=True, text=True, check=True)
        target = subprocess.run([
            "aws", "s3api", "list-objects-v2", "--bucket", bucket, "--profile", "edusprouts",
            "--query", "{count:length(Contents),bytes:sum(Contents[].Size)}", "--output", "json",
        ], capture_output=True, text=True, check=True)
        source_summary, target_summary = json.loads(source.stdout), json.loads(target.stdout)
        print(f"{container}: source={source_summary} target={target_summary} match={source_summary == target_summary}")
        if source_summary != target_summary:
            raise SystemExit(f"Verification failed for {container}")
