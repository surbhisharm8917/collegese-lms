#!/usr/bin/env python3
"""
Captures real screenshots of the locally-running Just Easy CA Classes app for
the guidebook. Uses locally-minted dev session cookies (see backend/_demo_seed.cjs)
and seeded demo content so every screen renders with realistic data.

Output: docs/screenshots/*.png
"""
import json
import os
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "screenshots")
os.makedirs(OUT, exist_ok=True)

with open("/tmp/shot_tokens.json") as f:
    TOKENS = json.load(f)
try:
    with open("/tmp/demo_ids.json") as f:
        IDS = json.load(f)
except FileNotFoundError:
    IDS = {}

C = IDS.get("courseId", "")
QRES = IDS.get("quizResultSubmissionId", "")
QATT = IDS.get("quizAttemptSubmissionId", "")
ASSESS = IDS.get("assessmentId", "")

# (filename, path, role|None, action|None)
# action: {"click": "Button Text"}  or  {"click_selector": "css"}
SHOTS = [
    # ---- Public (no login) ----
    ("01_home.png", "/home", None, None),
    ("02_login.png", "/login", None, None),
    ("03_register.png", "/register", None, None),
    ("04_ca_profession.png", "/ca-profession", None, None),
    ("05_grievance.png", "/grievance", None, None),
    ("06_verify_cert.png", "/verify/JECA-DEMO-2026-0001", None, None),
    ("07_privacy.png", "/privacy-policy", None, None),
    ("08_notfound.png", "/this-page-does-not-exist", None, None),
    ("60_forgot.png", "/forgot-password", None, None),
    ("61_verify_email.png", "/verify-email?token=demo-token", None, None),
    # ---- Student ----
    ("10_student_dashboard.png", "/dashboard/student/dashboard", "STUDENT", None),
    ("11_student_course_details.png", f"/dashboard/student/my-courses/{C}", "STUDENT", None),
    ("11b_student_courses.png", "/dashboard/student/my-courses", "STUDENT", None),
    ("12_student_live.png", "/dashboard/student/my-live-lec", "STUDENT", None),
    ("13_student_exams.png", "/dashboard/student/my-Exams", "STUDENT", None),
    ("14_student_quiz_attempt.png", f"/dashboard/student/quiz/attempt/{QATT}", "STUDENT", None),
    ("15_student_quiz_result.png", f"/dashboard/student/quiz/result/{QRES}", "STUDENT", None),
    ("16_student_assessment_detail.png", f"/dashboard/student/assessment/{ASSESS}/submit", "STUDENT", None),
    ("17_student_quizzes.png", "/dashboard/student/quizzes", "STUDENT", None),
    ("18_student_assessments.png", "/dashboard/student/assessments", "STUDENT", None),
    ("19_student_sessions.png", "/dashboard/student/sessions", "STUDENT", None),
    ("63_edit_profile.png", "/dashboard/student/studentProfile", "STUDENT", {"click": "Edit Profile"}),
    ("62_notifications.png", "/dashboard/student/dashboard", "STUDENT", {"click_selector": "header button:has(svg)"}),
    # ---- Teacher ----
    ("20_teacher_dashboard.png", "/dashboard/teacher/dashboardTeacher", "TEACHER", None),
    ("21_teacher_courses.png", "/dashboard/teacher/teacherMycourses", "TEACHER", None),
    ("22_teacher_quizzes.png", "/dashboard/teacher/quizzes", "TEACHER", None),
    ("23_teacher_assessments.png", "/dashboard/teacher/assessments", "TEACHER", None),
    ("24_teacher_exams.png", "/dashboard/teacher/manageExams", "TEACHER", None),
    ("25_teacher_live.png", "/dashboard/teacher/teacherlivelectures", "TEACHER", None),
    ("26_teacher_recording.png", "/dashboard/teacher/teacherRecording", "TEACHER", None),
    ("27_teacher_profile.png", "/dashboard/teacher/teacherprofile", "TEACHER", None),
    ("28_teacher_grade.png", f"/dashboard/teacher/assessment/{ASSESS}/submissions", "TEACHER", None),
    ("29_teacher_certs.png", "/dashboard/teacher/manageCertifications", "TEACHER", None),
    # ---- Assistant ----
    ("30_assistant_dashboard.png", "/dashboard/assistant/assistant", "ASSISTANT", None),
    ("31_assistant_quizzes.png", "/dashboard/assistant/quizzes", "ASSISTANT", None),
    ("32_assistant_assessments.png", "/dashboard/assistant/assessments", "ASSISTANT", None),
    ("33_assistant_grade.png", f"/dashboard/assistant/assessment/{ASSESS}/submissions", "ASSISTANT", None),
    ("34_assistant_profile.png", "/dashboard/assistant/profile", "ASSISTANT", None),
    # ---- Admin ----
    ("40_admin_dashboard.png", "/dashboard/admin/dashboard", "ADMIN", None),
    ("41_admin_users.png", "/dashboard/admin/users", "ADMIN", None),
    ("42_admin_courses.png", "/dashboard/admin/courses", "ADMIN", None),
    ("43_admin_quizzes.png", "/dashboard/admin/quizzes", "ADMIN", None),
    ("44_admin_support.png", "/dashboard/admin/support", "ADMIN", None),
    ("45_admin_profile.png", "/dashboard/admin/profile", "ADMIN", None),
    ("46_admin_certs.png", "/dashboard/admin/manageCertifications", "ADMIN", None),
    ("47_admin_create_course.png", "/dashboard/admin/courses", "ADMIN", {"click": "New Course"}),
    ("48_admin_enroll.png", "/dashboard/admin/courses", "ADMIN", {"click": "Enroll"}),
    # ---- Super Admin ----
    ("50_super_dashboard.png", "/dashboard/superadmin/superAdminDash", "SUPER_ADMIN", None),
    ("51_super_users.png", "/dashboard/superadmin/users", "SUPER_ADMIN", None),
    ("52_super_courses.png", "/dashboard/superadmin/courses", "SUPER_ADMIN", None),
    ("53_super_enroll.png", "/dashboard/superadmin/enrollments", "SUPER_ADMIN", None),
    ("54_super_bulk.png", "/dashboard/superadmin/register-bulk", "SUPER_ADMIN", None),
    ("55_super_create.png", "/dashboard/superadmin/create", "SUPER_ADMIN", None),
    ("56_super_export.png", "/dashboard/superadmin/export", "SUPER_ADMIN", None),
    ("57_super_settings.png", "/dashboard/superadmin/settings", "SUPER_ADMIN", None),
    ("58_super_exams.png", "/dashboard/superadmin/manageExams", "SUPER_ADMIN", None),
    ("59_super_sessions.png", "/dashboard/superadmin/sessions", "SUPER_ADMIN", None),
]


def cookie_for(role):
    return {
        "name": "auth_token", "value": TOKENS[role]["token"],
        "domain": "localhost", "path": "/", "httpOnly": True, "sameSite": "Lax",
    }


def main():
    ok, fail = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        contexts = {}

        def get_context(role):
            key = role or "PUBLIC"
            if key not in contexts:
                ctx = browser.new_context(
                    viewport={"width": 1440, "height": 900}, device_scale_factor=2,
                )
                if role:
                    ctx.add_cookies([cookie_for(role)])
                contexts[key] = ctx
            return contexts[key]

        for fname, path, role, action in SHOTS:
            page = get_context(role).new_page()
            url = BASE + path
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
            except Exception:
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                except Exception as e:
                    print(f"  FAIL  {fname:34s} {str(e)[:60]}")
                    fail.append(fname)
                    page.close()
                    continue
            page.wait_for_timeout(1600)
            if action:
                try:
                    if "click" in action:
                        page.get_by_role("button", name=action["click"], exact=False).first.click(timeout=5000)
                    elif "click_selector" in action:
                        page.locator(action["click_selector"]).first.click(timeout=5000)
                    page.wait_for_timeout(1200)
                except Exception:
                    pass  # best-effort dialog open
            try:
                page.screenshot(path=os.path.join(OUT, fname))
                print(f"  OK    {fname:34s} <- {path[:52]}")
                ok.append(fname)
            except Exception as e:
                print(f"  FAIL  {fname:34s} {str(e)[:60]}")
                fail.append(fname)
            page.close()

        for c in contexts.values():
            c.close()
        browser.close()

    print(f"\nCaptured {len(ok)} screenshots, {len(fail)} failed.")
    if fail:
        print("Failed:", ", ".join(fail))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
