#!/usr/bin/env python3
"""Captures the 8 previously-missing guidebook screens (3,7,13,18,25,34,42,47)
from the locally-running app, using seeded demo data and dev session cookies."""
import json
import os
import sys
from openpyxl import Workbook
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "screenshots")
os.makedirs(OUT, exist_ok=True)

with open("/tmp/shot_tokens.json") as f:
    TOKENS = json.load(f)
with open("/tmp/demo_ids.json") as f:
    IDS = json.load(f)

# Build a small Excel file for the bulk-upload summary screen.
XLSX = "/tmp/bulk_demo.xlsx"
wb = Workbook()
ws = wb.active
ws.append(["Name", "Email", "Phone", "Role"])
ws.append(["Demo Import One", "import.one@demo-justeasy.in", "+91 90000 11111", "Student"])
ws.append(["Demo Import Two", "import.two@demo-justeasy.in", "+91 90000 22222", "Student"])
ws.append(["Demo Import Three", "import.three@demo-justeasy.in", "+91 90000 33333", "Teacher"])
wb.save(XLSX)

LIVE = IDS.get("liveLectureId", "")
QUIZ = IDS.get("quizId", "")
ATTEMPT = IDS.get("examAttemptId", "")
VTOKEN = IDS.get("verifyToken", "demo")


def cookie_for(role):
    return {"name": "auth_token", "value": TOKENS[role]["token"], "domain": "localhost",
            "path": "/", "httpOnly": True, "sameSite": "Lax"}


def main():
    ok, fail = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=[
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--autoplay-policy=no-user-gesture-required",
        ])

        def ctx(role=None, cam=False):
            c = browser.new_context(viewport={"width": 1440, "height": 900},
                                    device_scale_factor=2,
                                    permissions=["camera", "microphone"] if cam else [])
            if role:
                c.add_cookies([cookie_for(role)])
            return c

        def shot(name, page, extra_wait=1600):
            page.wait_for_timeout(extra_wait)
            page.screenshot(path=os.path.join(OUT, name))
            print("  OK   ", name)
            ok.append(name)

        # ---- #3 Email verified success ----
        try:
            c = ctx()
            pg = c.new_page()
            pg.goto(f"{BASE}/verify-email?token={VTOKEN}", wait_until="networkidle", timeout=30000)
            shot("03_verify_email_success.png", pg, 2200)
            c.close()
        except Exception as e:
            print("  FAIL  03", str(e)[:80]); fail.append("03")

        # ---- #7 Notifications panel ----
        try:
            c = ctx("STUDENT")
            pg = c.new_page()
            pg.goto(f"{BASE}/dashboard/student/dashboard", wait_until="networkidle", timeout=30000)
            pg.wait_for_timeout(1500)
            pg.locator("button:has(svg.lucide-bell)").first.click(timeout=6000)
            shot("07_notifications.png", pg, 1400)
            c.close()
        except Exception as e:
            print("  FAIL  07", str(e)[:80]); fail.append("07")

        # ---- #13 Live classroom ----
        try:
            c = ctx("STUDENT", cam=True)
            pg = c.new_page()
            pg.goto(f"{BASE}/dashboard/student/my-live-lec/{LIVE}", wait_until="networkidle", timeout=30000)
            shot("13_live_classroom.png", pg, 2600)
            c.close()
        except Exception as e:
            print("  FAIL  13", str(e)[:80]); fail.append("13")

        # ---- #18 Proctored exam ----
        try:
            c = ctx("STUDENT", cam=True)
            pg = c.new_page()
            pg.goto(f"{BASE}/dashboard/student/my-Exams", wait_until="networkidle", timeout=30000)
            pg.wait_for_timeout(1500)
            pg.get_by_role("button", name="Start Exam").first.click(timeout=6000)
            pg.wait_for_timeout(2000)  # instructions screen
            try:
                pg.get_by_role("button", name="Start Exam").first.click(timeout=5000)
                pg.wait_for_timeout(2600)  # active proctored screen
            except Exception:
                pass
            shot("18_proctored_exam.png", pg, 1200)
            c.close()
        except Exception as e:
            print("  FAIL  18", str(e)[:80]); fail.append("18")

        # ---- #25 Quiz questions manager ----
        try:
            c = ctx("TEACHER")
            pg = c.new_page()
            pg.goto(f"{BASE}/dashboard/teacher/quiz/{QUIZ}/questions", wait_until="networkidle", timeout=30000)
            shot("25_teacher_quiz_questions.png", pg, 1800)
            c.close()
        except Exception as e:
            print("  FAIL  25", str(e)[:80]); fail.append("25")

        # ---- #34 Edit User dialog ----
        try:
            c = ctx("ADMIN")
            pg = c.new_page()
            pg.goto(f"{BASE}/dashboard/admin/users", wait_until="networkidle", timeout=30000)
            pg.wait_for_timeout(1600)
            pg.locator("button[title='Edit']").first.click(timeout=6000)
            shot("34_admin_edit_user.png", pg, 1400)
            c.close()
        except Exception as e:
            print("  FAIL  34", str(e)[:80]); fail.append("34")

        # ---- #42 Bulk Register Excel summary ----
        try:
            c = ctx("SUPER_ADMIN")
            pg = c.new_page()
            pg.goto(f"{BASE}/dashboard/superadmin/register-bulk", wait_until="networkidle", timeout=30000)
            pg.wait_for_timeout(1400)
            try:
                pg.get_by_text("Bulk Upload", exact=False).first.click(timeout=5000)
                pg.wait_for_timeout(800)
            except Exception:
                pass
            pg.locator("input[type=file]").first.set_input_files(XLSX)
            pg.wait_for_timeout(900)
            pg.get_by_role("button", name="Register Users").first.click(timeout=6000)
            shot("42_bulk_excel_summary.png", pg, 3000)
            c.close()
        except Exception as e:
            print("  FAIL  42", str(e)[:80]); fail.append("42")

        # ---- #47 Evaluate exam attempt ----
        try:
            c = ctx("SUPER_ADMIN")
            pg = c.new_page()
            pg.goto(f"{BASE}/evaluate-attempt/{ATTEMPT}", wait_until="networkidle", timeout=30000)
            shot("47_evaluate_attempt.png", pg, 2200)
            c.close()
        except Exception as e:
            print("  FAIL  47", str(e)[:80]); fail.append("47")

        browser.close()

    print(f"\nCaptured {len(ok)}, failed {len(fail)}: {fail}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
