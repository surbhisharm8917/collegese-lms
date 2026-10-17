#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generates "JUSTEASY.IN GUIDE BOOK.docx" — a complete, beginner-friendly user
manual for the Just Easy CA Classes LMS platform covering every role, page,
feature and button, with screenshot placeholder boxes and exact captions.

Run:  python3 scripts/generate_guidebook.py
Output:  ./JUSTEASY.IN GUIDE BOOK.docx
"""

import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# ---------------------------------------------------------------------------
# Brand palette
# ---------------------------------------------------------------------------
NAVY = RGBColor(0x07, 0x2A, 0x60)
ORANGE = RGBColor(0xFF, 0x5A, 0x00)
DARK = RGBColor(0x1F, 0x2A, 0x37)
GREY = RGBColor(0x6B, 0x72, 0x80)
LIGHT_GREY = RGBColor(0xE5, 0xE7, 0xEB)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

NAVY_HEX = "072A60"
ORANGE_HEX = "FF5A00"
SHOT_BG_HEX = "FFF3EC"      # light orange tint for screenshot boxes
TIP_BG_HEX = "ECFDF5"       # light green
NOTE_BG_HEX = "EFF6FF"      # light blue
WARN_BG_HEX = "FEF2F2"      # light red
HEADER_BG_HEX = "072A60"    # table header navy
ZEBRA_HEX = "F5F7FA"        # alt row

BODY_FONT = "Calibri"
HEAD_FONT = "Calibri"

SHOTS = []  # collects (number, title, where, capture, embedded) for the appendix checklist

# Directory holding real captured screenshots (see scripts/capture_screens.py).
SHOT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "screenshots"
)

# Maps a screenshot title (exact) -> captured PNG filename. When the file exists,
# the real screenshot is embedded; otherwise a placeholder box is drawn.
SCREENSHOT_IMAGES = {
    # Getting started / shared
    "The public Home / landing page": "01_home.png",
    "The Registration form": "03_register.png",
    "The Login / Sign-in page": "02_login.png",
    "Forgot Password request screen": "60_forgot.png",
    "The dashboard layout (sidebar + header)": "10_student_dashboard.png",
    "Profile page with Edit dialog open": "63_edit_profile.png",
    # Student
    "Student Overview dashboard": "10_student_dashboard.png",
    "My Courses grid": "11b_student_courses.png",
    "Course Details with video player and lecture list": "11_student_course_details.png",
    "Live Classes list": "12_student_live.png",
    "Quiz attempt screen": "14_student_quiz_attempt.png",
    "Quiz Results": "15_student_quiz_result.png",
    "Assessment submission page": "16_student_assessment_detail.png",
    "Exam Dashboard — Available Exams tab": "13_student_exams.png",
    "Login Activity": "19_student_sessions.png",
    # Teacher
    "Teacher Dashboard": "20_teacher_dashboard.png",
    "Teacher Live Lectures": "25_teacher_live.png",
    "Teacher My Courses upload form": "21_teacher_courses.png",
    "Recorded Lectures management": "26_teacher_recording.png",
    "Manage Quizzes list": "22_teacher_quizzes.png",
    "Manage Assessments": "23_teacher_assessments.png",
    "Grade submissions page": "28_teacher_grade.png",
    "Manage Exams": "24_teacher_exams.png",
    "Manage Certifications": "29_teacher_certs.png",
    # Assistant
    "Assistant Dashboard": "30_assistant_dashboard.png",
    "Assistant grading a submission": "33_assistant_grade.png",
    # Admin
    "Admin Dashboard Overview": "40_admin_dashboard.png",
    "Users management table": "41_admin_users.png",
    "Courses management": "42_admin_courses.png",
    "Create New Course dialog": "47_admin_create_course.png",
    "Student Enrollment dialog": "48_admin_enroll.png",
    "Support tickets": "44_admin_support.png",
    # Super Admin
    "Super Admin Dashboard": "50_super_dashboard.png",
    "Schedule a live lecture": "55_super_create.png",
    "Bulk Register — Single User": "54_super_bulk.png",
    "All Enrolments": "53_super_enroll.png",
    "Export Dashboard": "56_super_export.png",
    "Active Sessions (all users)": "59_super_sessions.png",
    "System Settings": "57_super_settings.png",
    # Public
    "A CA Knowledge Hub page": "04_ca_profession.png",
    "Grievance and Support form": "05_grievance.png",
    "Verify Certificate result": "06_verify_cert.png",
    # Previously-missing screens, now captured with seeded demo data
    "Email verified confirmation": "03_verify_email_success.png",
    "Notifications panel": "07_notifications.png",
    "Inside the live classroom": "13_live_classroom.png",
    "The proctored exam start screen (rules & instructions)": "18_proctored_exam.png",
    "Quiz questions manager": "25_teacher_quiz_questions.png",
    "Edit User dialog": "34_admin_edit_user.png",
    "Bulk Register — Excel upload summary": "42_bulk_excel_summary.png",
    "Evaluate exam attempt": "47_evaluate_attempt.png",
}


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------
def _shade(el, hex_color):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    el.append(shd)


def shade_cell(cell, hex_color):
    _shade(cell._tc.get_or_add_tcPr(), hex_color)


def shade_paragraph(paragraph, hex_color):
    _shade(paragraph._p.get_or_add_pPr(), hex_color)


def set_cell_borders(cell, color=NAVY_HEX, sz="8", space="0", val="single"):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        e = OxmlElement(f"w:{edge}")
        e.set(qn("w:val"), val)
        e.set(qn("w:sz"), sz)
        e.set(qn("w:space"), space)
        e.set(qn("w:color"), color)
        borders.append(e)
    tcPr.append(borders)


def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    m = OxmlElement("w:tcMar")
    for name, val in (("top", top), ("bottom", bottom), ("start", left), ("end", right)):
        node = OxmlElement(f"w:{name}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        m.append(node)
    tcPr.append(m)


def no_space(paragraph, before=0, after=0):
    pf = paragraph.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)


def run(paragraph, text, size=11, bold=False, italic=False, color=DARK, font=BODY_FONT):
    r = paragraph.add_run(text)
    r.font.name = font
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.italic = italic
    r.font.color.rgb = color
    return r


def spacer(pts=3):
    """A very thin blank paragraph used to separate blocks without big gaps."""
    p = doc.add_paragraph()
    no_space(p, 0, 0)
    r = p.add_run(" ")
    r.font.size = Pt(pts)
    return p


# ---------------------------------------------------------------------------
# Document object + base styling
# ---------------------------------------------------------------------------
doc = Document()

normal = doc.styles["Normal"]
normal.font.name = BODY_FONT
normal.font.size = Pt(11)
normal.font.color.rgb = DARK
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.12

for lvl, sz, col in (("Heading 1", 20, NAVY), ("Heading 2", 15, ORANGE), ("Heading 3", 12.5, NAVY)):
    st = doc.styles[lvl]
    st.font.name = HEAD_FONT
    st.font.size = Pt(sz)
    st.font.color.rgb = col
    st.font.bold = True

# Page margins
for section in doc.sections:
    section.top_margin = Inches(0.9)
    section.bottom_margin = Inches(0.9)
    section.left_margin = Inches(0.9)
    section.right_margin = Inches(0.9)


# ---------------------------------------------------------------------------
# Building-block helpers
# ---------------------------------------------------------------------------
def hrule(color_hex=ORANGE_HEX, size="18"):
    p = doc.add_paragraph()
    no_space(p, 2, 8)
    pPr = p._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), size)
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), color_hex)
    pbdr.append(bottom)
    pPr.append(pbdr)
    return p


def page_break():
    doc.add_page_break()


def h1(text, number=None):
    page_break()
    p = doc.add_heading(level=1)
    if number is not None:
        run(p, f"{number}   ", size=20, bold=True, color=ORANGE)
    run(p, text, size=20, bold=True, color=NAVY)
    hrule()
    return p


def h2(text):
    p = doc.add_heading(level=2)
    run(p, text, size=15, bold=True, color=ORANGE)
    return p


def h3(text):
    p = doc.add_heading(level=3)
    run(p, text, size=12.5, bold=True, color=NAVY)
    return p


def para(text, size=11, color=DARK, bold=False, italic=False, after=6, align=None):
    p = doc.add_paragraph()
    no_space(p, 0, after)
    if align:
        p.alignment = align
    run(p, text, size=size, bold=bold, italic=italic, color=color)
    return p


def lead(text):
    """Intro paragraph in muted grey."""
    return para(text, size=11.5, color=GREY, italic=True, after=8)


def bullets(items):
    for it in items:
        p = doc.add_paragraph(style="List Bullet")
        no_space(p, 0, 2)
        if isinstance(it, tuple):
            run(p, it[0] + " ", bold=True, color=NAVY)
            run(p, it[1])
        else:
            run(p, it)


def steps(items):
    for i, it in enumerate(items, 1):
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.left_indent = Inches(0.3)
        pf.first_line_indent = Inches(-0.3)
        no_space(p, 0, 3)
        run(p, f"{i}.  ", bold=True, color=ORANGE)
        if isinstance(it, tuple):
            run(p, it[0] + " ", bold=True, color=NAVY)
            run(p, it[1])
        else:
            run(p, it)


def callout(kind, text):
    palette = {
        "TIP": (TIP_BG_HEX, "059669", "TIP"),
        "NOTE": (NOTE_BG_HEX, "2563EB", "NOTE"),
        "WARNING": (WARN_BG_HEX, "DC2626", "IMPORTANT"),
    }
    bg, border, label = palette[kind]
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = True
    cell = tbl.cell(0, 0)
    shade_cell(cell, bg)
    set_cell_borders(cell, color=border, sz="6")
    set_cell_margins(cell)
    cell.text = ""
    p = cell.paragraphs[0]
    no_space(p, 2, 2)
    run(p, f"{label}:  ", bold=True, color=RGBColor.from_string(border))
    run(p, text, size=10.5, color=DARK)
    spacer()


def button_table(rows, col1="Button / Control", col2="What it does"):
    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.style = "Table Grid"
    tbl.columns[0].width = Inches(2.5)
    tbl.columns[1].width = Inches(4.4)
    hdr = tbl.rows[0].cells
    for c, txt in zip(hdr, (col1, col2)):
        shade_cell(c, HEADER_BG_HEX)
        set_cell_margins(c)
        c.text = ""
        pp = c.paragraphs[0]
        no_space(pp)
        run(pp, txt, bold=True, color=WHITE, size=10.5)
    for idx, (b, d) in enumerate(rows):
        cells = tbl.add_row().cells
        if idx % 2 == 1:
            for c in cells:
                shade_cell(c, ZEBRA_HEX)
        for c in cells:
            set_cell_margins(c)
        cells[0].text = ""
        p0 = cells[0].paragraphs[0]
        no_space(p0)
        run(p0, b, bold=True, color=NAVY, size=10.5)
        cells[1].text = ""
        p1 = cells[1].paragraphs[0]
        no_space(p1)
        run(p1, d, size=10.5)
    spacer()
    return tbl


def screenshot(title, where, capture):
    n = len(SHOTS) + 1
    img_name = SCREENSHOT_IMAGES.get(title)
    img_path = os.path.join(SHOT_DIR, img_name) if img_name else None
    embedded = bool(img_path and os.path.exists(img_path))
    SHOTS.append((n, title, where, capture, embedded))

    if embedded:
        # Framed real screenshot: caption bar + image inside a bordered cell.
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_borders(cell, color=NAVY_HEX, sz="6")
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        cell.text = ""
        cap = cell.paragraphs[0]
        no_space(cap, 0, 4)
        run(cap, f"Figure {n:02d}. ", bold=True, color=ORANGE, size=10)
        run(cap, title, bold=True, color=NAVY, size=10)
        imgp = cell.add_paragraph()
        imgp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        no_space(imgp, 2, 2)
        imgp.add_run().add_picture(img_path, width=Inches(5.5))
        where_p = cell.add_paragraph()
        no_space(where_p, 2, 0)
        run(where_p, "Where to go:  ", bold=True, color=DARK, size=9)
        run(where_p, where, size=9, color=GREY)
        spacer()
        return

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    shade_cell(cell, SHOT_BG_HEX)
    set_cell_borders(cell, color=ORANGE_HEX, sz="12", val="dashed")
    set_cell_margins(cell, top=160, bottom=160, left=180, right=180)
    cell.text = ""

    p = cell.paragraphs[0]
    no_space(p, 0, 4)
    run(p, f"[  SCREENSHOT {n:02d}  ]", bold=True, color=ORANGE, size=12)

    p2 = cell.add_paragraph()
    no_space(p2, 0, 3)
    run(p2, title, bold=True, color=NAVY, size=11.5)

    p3 = cell.add_paragraph()
    no_space(p3, 0, 2)
    run(p3, "Where to go:  ", bold=True, color=DARK, size=10)
    run(p3, where, size=10, color=DARK)

    p4 = cell.add_paragraph()
    no_space(p4, 0, 2)
    run(p4, "Capture:  ", bold=True, color=DARK, size=10)
    run(p4, capture, size=10, color=DARK)

    p5 = cell.add_paragraph()
    no_space(p5, 4, 0)
    run(p5, "(Paste your screenshot here, then delete this placeholder box.)",
        italic=True, color=GREY, size=9)
    spacer()


def toc_field():
    p = doc.add_paragraph()
    run_el = p.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = 'TOC \\o "1-3" \\h \\z \\u'
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    fld_text = OxmlElement("w:t")
    fld_text.text = "Right-click here and choose \u201cUpdate Field\u201d to build the table of contents."
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    r = run_el._r
    r.append(fld_begin)
    r.append(instr)
    r.append(fld_sep)
    r.append(fld_text)
    r.append(fld_end)


def footer_page_numbers():
    section = doc.sections[0]
    footer = section.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, "Just Easy CA Classes — Platform Guide Book        Page ", size=8.5, color=GREY)
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = "PAGE"
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    rr = p.add_run()
    rr.font.size = Pt(8.5)
    rr.font.color.rgb = GREY
    rr._r.append(fld_begin)
    rr._r.append(instr)
    rr._r.append(fld_end)


# ===========================================================================
# COVER PAGE
# ===========================================================================
def build_cover():
    logo = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "frontend", "public", "brand", "just-easy-ca-classes-512.png",
    )
    if os.path.exists(logo):
        lp = doc.add_paragraph()
        lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        lp.add_run().add_picture(logo, width=Inches(1.9))
    else:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run(p, "JUST EASY CA CLASSES", size=13, bold=True, color=ORANGE)
        p2 = doc.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run(p2, "Simplifying Commerce Education", size=11, italic=True, color=GREY)

    doc.add_paragraph()

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(title, "JUSTEASY.IN", size=36, bold=True, color=NAVY)
    title2 = doc.add_paragraph()
    title2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(title2, "GUIDE BOOK", size=36, bold=True, color=ORANGE)

    hrule()

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(sub, "The Complete Platform User Manual", size=16, bold=True, color=DARK)

    sub2 = doc.add_paragraph()
    sub2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(sub2,
        "Every role · every page · every feature · every button — explained step by step",
        size=11.5, italic=True, color=GREY)

    for _ in range(2):
        doc.add_paragraph()

    roles = doc.add_paragraph()
    roles.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(roles, "STUDENT   ·   TEACHER   ·   ASSISTANT   ·   ADMIN   ·   SUPER ADMIN",
        size=11, bold=True, color=NAVY)

    for _ in range(2):
        doc.add_paragraph()

    foot = doc.add_paragraph()
    foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(foot, "A beginner-friendly handbook. No prior experience needed.",
        size=10.5, color=GREY)
    foot2 = doc.add_paragraph()
    foot2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(foot2, "Document version 1.0", size=9.5, color=GREY)


# ===========================================================================
# USER TYPES (appears on page 2)
# ===========================================================================
def build_user_types():
    page_break()
    p = doc.add_heading(level=1)
    run(p, "The Five Types of Users", size=20, bold=True, color=NAVY)
    hrule()
    lead("Everyone who uses Just Easy CA Classes signs in with one role. Your role decides "
         "which menus, pages and buttons you see. This guide covers all five user types "
         "below — and each has its own dedicated Part later in the book.")

    tbl = doc.add_table(rows=1, cols=4)
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ("Role", "In a nutshell", "What this person does", "Guide")
    widths = (Inches(1.15), Inches(1.35), Inches(3.7), Inches(0.7))
    for c, t, w in zip(tbl.rows[0].cells, headers, widths):
        shade_cell(c, HEADER_BG_HEX)
        set_cell_margins(c)
        c.width = w
        c.text = ""
        pp = c.paragraphs[0]
        no_space(pp)
        run(pp, t, bold=True, color=WHITE, size=10.5)
    rows = [
        ("STUDENT", "The learner",
         "Watches recorded lectures, joins live classes, takes quizzes, submits assessments, sits proctored exams and earns certificates.", "Part 3"),
        ("TEACHER", "The faculty",
         "Uploads lectures, runs live classes, builds quizzes and exams, creates assessments and grades student work.", "Part 4"),
        ("ASSISTANT", "The grading helper",
         "Marks assessments and looks after the quizzes, exams and certifications assigned to them.", "Part 5"),
        ("ADMIN", "The manager",
         "Manages users, courses and enrolments, answers support tickets, and runs day-to-day operations.", "Part 6"),
        ("SUPER ADMIN", "The owner",
         "Full control: everything an Admin can do, plus scheduling live lectures, bulk registration, data exports and system settings.", "Part 7"),
    ]
    for i, (role, nut, does, part) in enumerate(rows):
        cells = tbl.add_row().cells
        if i % 2 == 1:
            for c in cells:
                shade_cell(c, ZEBRA_HEX)
        for c, w in zip(cells, widths):
            set_cell_margins(c)
            c.width = w
        cells[0].text = ""
        no_space(cells[0].paragraphs[0])
        run(cells[0].paragraphs[0], role, bold=True, color=ORANGE, size=10.5)
        cells[1].text = ""
        no_space(cells[1].paragraphs[0])
        run(cells[1].paragraphs[0], nut, bold=True, color=NAVY, size=10)
        cells[2].text = ""
        no_space(cells[2].paragraphs[0])
        run(cells[2].paragraphs[0], does, size=10)
        cells[3].text = ""
        no_space(cells[3].paragraphs[0])
        run(cells[3].paragraphs[0], part, bold=True, color=NAVY, size=10)
    spacer(6)

    h3("How people get their accounts")
    bullets([
        ("Students", "usually create their own account from the Register page, then verify their email."),
        ("Teachers, Assistants, Admins and Super Admins", "are created for you by an administrator; you receive a private setup link and choose your own password."),
    ])
    callout("NOTE", "You only ever see the tools for your own role. If you need something "
                    "outside your role, contact your Admin or Super Admin.")


# ===========================================================================
# TEST LOGIN ACCOUNTS (appears on page 3)
# ===========================================================================
def build_credentials():
    page_break()
    p = doc.add_heading(level=1)
    run(p, "Test Login Accounts", size=20, bold=True, color=NAVY)
    hrule()
    lead("Use these ready-made accounts to sign in and explore the platform as each role. "
         "Open the Login page, type the username (email) and password exactly as shown, then "
         "click Sign in — you land straight on that role's dashboard.")
    callout("WARNING", "These are TEST accounts for the demo / staging environment. Change "
                       "or remove these passwords before using the platform for real, and do "
                       "not share this page publicly.")

    tbl = doc.add_table(rows=1, cols=4)
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ("Role", "Username (email)", "Password", "Opens at")
    widths = (Inches(1.25), Inches(2.4), Inches(1.75), Inches(1.5))
    for c, t, w in zip(tbl.rows[0].cells, headers, widths):
        shade_cell(c, HEADER_BG_HEX)
        set_cell_margins(c)
        c.width = w
        c.text = ""
        pp = c.paragraphs[0]
        no_space(pp)
        run(pp, t, bold=True, color=WHITE, size=10.5)
    creds = [
        ("STUDENT", "sneha@collegese.in", "Student@2026", "Student dashboard"),
        ("TEACHER", "priya@collegese.in", "Teacher@2026", "Teacher dashboard"),
        ("ASSISTANT", "rahul@collegese.in", "Assistant@2026", "Assistant dashboard"),
        ("ADMIN", "gagan@collegese.in", "Admin@2026", "Admin dashboard"),
        ("SUPER ADMIN", "ajay@collegese.in", "SuperAdmin@2026", "Super Admin dashboard"),
    ]
    for i, (role, email, pw, dash) in enumerate(creds):
        cells = tbl.add_row().cells
        if i % 2 == 1:
            for c in cells:
                shade_cell(c, ZEBRA_HEX)
        for c, w in zip(cells, widths):
            set_cell_margins(c)
            c.width = w
        cells[0].text = ""
        no_space(cells[0].paragraphs[0])
        run(cells[0].paragraphs[0], role, bold=True, color=ORANGE, size=10.5)
        cells[1].text = ""
        no_space(cells[1].paragraphs[0])
        run(cells[1].paragraphs[0], email, color=NAVY, size=10.5)
        cells[2].text = ""
        no_space(cells[2].paragraphs[0])
        run(cells[2].paragraphs[0], pw, bold=True, color=DARK, size=10.5)
        cells[3].text = ""
        no_space(cells[3].paragraphs[0])
        run(cells[3].paragraphs[0], dash, color=GREY, size=10)
    spacer(6)

    h3("How to sign in with a test account")
    steps([
        ("Open the", "Login page (from the Home page, click Start Learning)."),
        "Type the Username (email) from the table above into the EMAIL box.",
        "Type the matching Password into the PASSWORD box.",
        ("Click", "Sign in — you are taken straight to that role's dashboard."),
        "To try a different role, log out (avatar menu, top-right) and sign in with another account.",
    ])
    callout("NOTE", "Every password meets the platform's rule of at least 8 characters with an "
                    "uppercase letter, a lowercase letter and a number. If you change a password "
                    "in Profile, remember to update it here too.")


# ===========================================================================
# TABLE OF CONTENTS
# ===========================================================================
def build_toc():
    page_break()
    p = doc.add_heading(level=1)
    run(p, "Table of Contents", size=20, bold=True, color=NAVY)
    hrule()
    lead("The table below is generated automatically by Word. If it shows a grey "
         "message, right-click it and choose \u201cUpdate Field\u201d \u2192 \u201cUpdate entire table\u201d.")
    toc_field()

    para("")
    h3("What's inside — at a glance")
    bullets([
        ("Part 1.", "Welcome & Platform Overview — what the platform is and how the roles fit together."),
        ("Part 2.", "Getting Started for Everyone — accounts, login, passwords, and the dashboard layout."),
        ("Part 3.", "The Student Guide — learning, live classes, quizzes, assessments, exams, certificates."),
        ("Part 4.", "The Teacher Guide — teaching, uploading lectures, quizzes, grading, exams."),
        ("Part 5.", "The Assistant Guide — grading workload and helper tasks."),
        ("Part 6.", "The Admin Guide — users, courses, enrolments, support, day-to-day operations."),
        ("Part 7.", "The Super Admin Guide — full control, scheduling, exports, system settings."),
        ("Part 8.", "Public & Information Pages — landing page, legal, grievance, certificate check."),
        ("Part 9.", "Appendices — glossary, status badges, troubleshooting, and a screenshot checklist."),
    ])


# ===========================================================================
# PART 1 — OVERVIEW
# ===========================================================================
def build_overview():
    h1("Welcome & Platform Overview", number="Part 1")

    h2("What is Just Easy CA Classes?")
    para("Just Easy CA Classes (the website you may know as JustEasy.in) is an online "
         "learning platform built specifically for CA and commerce students. It brings "
         "everything a coaching institute needs into one place:")
    bullets([
        "Structured courses made of recorded video lectures.",
        "Live online classes where a teacher and students meet in real time.",
        "Quizzes for quick practice and instant scoring.",
        "Assessments (assignments) that students submit and teachers grade with feedback.",
        "Proctored exams (camera-monitored) with automatic and manual evaluation.",
        "Certificates that can be verified by anyone using a certificate ID.",
        "Progress tracking, analytics, and data exports for staff.",
    ])
    para("The tagline of the platform is \u201cSimplifying Commerce Education.\u201d This guide "
         "explains the entire platform in plain language, so that someone who has never "
         "seen it before can sit down and use it confidently.")

    callout("NOTE", "Throughout this book, on-screen buttons and labels are written in bold, "
                    "exactly as they appear on the screen — for example, Start Learning or "
                    "Save Changes. Follow the words on your screen and you cannot get lost.")

    h2("Who uses the platform? The five roles")
    para("Every person who logs in has a role. Your role decides which menus, pages and "
         "buttons you see. There are five roles:")
    button_table([
        ("Student", "A learner. Watches lectures, joins live classes, takes quizzes, submits assessments, sits exams, and earns certificates."),
        ("Teacher", "Faculty. Uploads lectures, runs live classes, creates quizzes and exams, and grades student work."),
        ("Assistant", "A grading helper. Focuses on marking assessments and managing quizzes, exams and certifications assigned to them."),
        ("Admin", "A manager. Handles users, courses, enrolments, support tickets, and general day-to-day running of the platform."),
        ("Super Admin", "The owner-level role. Everything an Admin can do, plus scheduling live lectures, bulk registration, data exports, and system settings."),
    ], col1="Role", col2="What this person does")

    h2("How the roles relate to each other")
    para("A simple way to picture the platform: Super Admin sits at the top with full "
         "control, Admin runs daily operations, Teachers and Assistants deliver and grade "
         "the learning, and Students consume it. The diagram below shows who can do what.")

    # Simple capability matrix
    h3("Capability comparison")
    tbl = doc.add_table(rows=1, cols=6)
    tbl.style = "Table Grid"
    headers = ["Capability", "Student", "Teacher", "Assistant", "Admin", "Super Admin"]
    for c, t in zip(tbl.rows[0].cells, headers):
        shade_cell(c, HEADER_BG_HEX)
        set_cell_margins(c)
        c.text = ""
        pp = c.paragraphs[0]
        no_space(pp)
        run(pp, t, bold=True, color=WHITE, size=9.5)
    matrix = [
        ("Watch lectures / learn", "Yes", "Yes", "-", "-", "-"),
        ("Join live classes", "Yes", "Host", "-", "View", "Host/View"),
        ("Take quizzes & exams", "Yes", "-", "-", "-", "-"),
        ("Create quizzes / exams", "-", "Yes", "Yes", "Yes", "Yes"),
        ("Grade assessments", "-", "Yes", "Yes", "Yes", "Yes"),
        ("Manage courses", "-", "Own", "-", "Yes", "Yes"),
        ("Manage users", "-", "-", "-", "Yes", "Yes"),
        ("Schedule live lectures", "-", "-", "-", "-", "Yes"),
        ("Bulk register users", "-", "-", "-", "Yes", "Yes"),
        ("Export data", "-", "-", "-", "-", "Yes"),
        ("System settings / maintenance", "-", "-", "-", "Yes", "Yes"),
    ]
    for i, rowvals in enumerate(matrix):
        cells = tbl.add_row().cells
        if i % 2 == 1:
            for c in cells:
                shade_cell(c, ZEBRA_HEX)
        for j, val in enumerate(rowvals):
            set_cell_margins(c)
            cells[j].text = ""
            pp = cells[j].paragraphs[0]
            no_space(pp)
            run(pp, val, bold=(j == 0), color=(NAVY if j == 0 else DARK), size=9.5)
    doc.add_paragraph()

    h2("Key words you will see everywhere")
    bullets([
        ("Course:", "A subject package containing lectures, quizzes, assessments and exams."),
        ("Lecture:", "A single video lesson. Recorded lectures can be replayed any time."),
        ("Live Class / Live Lecture:", "A scheduled real-time video session with a teacher."),
        ("Quiz:", "A short set of questions, usually timed, scored instantly."),
        ("Assessment:", "An assignment you submit as a file or typed text; a person grades it."),
        ("Exam:", "A formal, often camera-monitored test with pass/fail marks."),
        ("Enrolment:", "The link between a student and a course they are allowed to study."),
        ("Certificate:", "Proof of completion that can be checked online by its ID."),
        ("Dashboard:", "Your personal home screen after logging in."),
    ])

    h2("How to read this guide")
    steps([
        "Find your role's Part (Student, Teacher, Assistant, Admin or Super Admin).",
        "Read Part 2 first if you have never logged in — it covers creating an account and signing in.",
        ("Figures", "are real screenshots of the live platform. Where a screen needs sample data, you'll see a dashed orange box telling you exactly what to capture."),
        ("Bold words", "are buttons or labels you tap/click on the actual screen."),
        "Follow the numbered steps in order for each task.",
    ])
    callout("TIP", "Keep this document open on one side of your screen and the platform on "
                   "the other. Do each step as you read it — you will learn the whole system "
                   "in one sitting.")


# ===========================================================================
# PART 2 — GETTING STARTED
# ===========================================================================
def build_getting_started():
    h1("Getting Started — For Everyone", number="Part 2")
    lead("This part applies to every user, no matter your role. It covers opening the "
         "website, creating an account, verifying your email, signing in, handling "
         "passwords, and understanding the dashboard layout.")

    h2("2.1  Opening the website (the Home page)")
    para("When you open the platform's web address in any modern browser (Chrome, Edge, "
         "Safari or Firefox), you land on the public Home page. It introduces the platform "
         "and is the gateway to logging in or creating an account.")
    h3("What you see on the Home page")
    bullets([
        ("Hero banner:", "the brand name, the tagline, and a badge reading Now open for enrolment."),
        ("Stats bar:", "quick highlights — CA (Focused Curriculum), Live (Interactive Classes), Tests (Practice & Exams), 24/7 (Learning Access)."),
        ("CA Knowledge Hub:", "three cards — CA Profession, CA Curriculum and Career Roadmap — each with an Explore button."),
        ("Features grid:", "nine cards describing what the platform offers."),
        ("How it works:", "three steps — 01 Create Your Account, 02 Join Your Classes, 03 Practice & Improve."),
        ("Final call-to-action:", "\u201cReady to simplify commerce education?\u201d with buttons to begin."),
    ])
    h3("Buttons on the Home page")
    button_table([
        ("Start Learning", "Takes you to the Sign-in (Login) page."),
        ("Create Account", "Takes you to the Registration page to make a new account."),
        ("Explore", "On each CA card — opens the CA Profession, CA Curriculum or Career Roadmap information page."),
        ("Navbar links (top)", "Site-wide navigation shown on every public page."),
        ("Footer links (bottom)", "Legal pages, support and company information."),
    ])
    screenshot(
        "The public Home / landing page",
        "Open the platform web address while logged out.",
        "The full landing page — hero banner with Start Learning and Create Account buttons, the stats bar, and the CA Knowledge Hub cards.")
    callout("NOTE", "If you are already logged in and open the Home page, the platform "
                    "automatically sends you to your own dashboard.")

    h2("2.2  Creating your account (Registration)")
    para("New students create their own account from the Register page. (Staff accounts "
         "such as Teacher, Admin and Super Admin are usually created for you by an "
         "administrator — see Part 6 and Part 7.)")
    h3("Fields on the Create your account form")
    button_table([
        ("FULL NAME", "Type your full name."),
        ("EMAIL", "Type the email address you will log in with."),
        ("PHONE", "Type your phone number."),
        ("PASSWORD", "Create a password: at least 8 characters, with an uppercase letter, a lowercase letter and a number."),
        ("Eye icon", "Shows or hides the password so you can check it."),
        ("Age checkbox", "\u201cI am 18 or older\u2026\u201d — you must tick this."),
        ("Terms checkbox", "\u201cI agree to the Terms of Service.\u201d — required; links to the Terms page."),
        ("Privacy checkbox", "\u201cI acknowledge the Privacy Policy.\u201d — required; links to the Privacy page."),
        ("Create account", "Submits the form and creates your account."),
        ("Sign in", "If you already have an account, go to the Login page instead."),
    ])
    h3("Step by step: register")
    steps([
        ("Open the Home page and click", "Create Account (or go straight to the Register page)."),
        "Fill in FULL NAME, EMAIL, PHONE and PASSWORD.",
        "Tick all three required checkboxes (age, terms, privacy).",
        ("Click", "Create account."),
        ("A success screen appears:", "Check your email — the platform has emailed you a verification link."),
    ])
    screenshot(
        "The Registration form",
        "Home page \u2192 Create Account.",
        "The Create your account form with the name, email, phone and password fields and the three checkboxes visible.")
    callout("WARNING", "Passwords are never sent by email. New staff accounts receive a "
                       "private 24-hour setup link and choose their own password.")

    h2("2.3  Verifying your email")
    para("Before you can use a new student account, you must confirm your email address. "
         "Open the email you received and click the verification link. It opens the Verify "
         "Email page, which checks the link and shows one of these results:")
    button_table([
        ("Verifying email", "The platform is checking your link (shows briefly)."),
        ("Email verified", "Success — your account is now active. Click Continue to login."),
        ("Verification failed", "The link was incomplete, invalid or expired. Use Create or verify an account to try again."),
    ])
    screenshot(
        "Email verified confirmation",
        "Click the link inside the verification email.",
        "The Email verified success screen with the green tick and the Continue to login link.")

    h2("2.4  Signing in (Login)")
    para("The Login page is where you enter the platform every day.")
    button_table([
        ("EMAIL", "Type your registered email."),
        ("PASSWORD", "Type your password."),
        ("Forgot password?", "Opens the password-reset page if you cannot remember your password."),
        ("Sign in", "Logs you in. While it works it shows Signing in\u2026"),
        ("Create one", "Goes to the Registration page for people without an account."),
    ])
    h3("Step by step: log in")
    steps([
        "Open the Login page (Home \u2192 Start Learning).",
        "Type your EMAIL and PASSWORD.",
        ("Click", "Sign in."),
        "On success you are taken straight to the dashboard for your role.",
    ])
    screenshot(
        "The Login / Sign-in page",
        "Home page \u2192 Start Learning.",
        "The Sign in card with the EMAIL and PASSWORD boxes, the Forgot password? link and the Sign in button.")
    callout("NOTE", "If an administrator has required you to set a new password, logging in "
                    "sends you to the Change password page first (see 2.6).")

    h2("2.5  Forgot password & reset")
    para("If you cannot remember your password:")
    steps([
        ("On the Login page click", "Forgot password?"),
        "Enter your email address and request a reset link.",
        "Open the reset email and click its link — this opens the Reset Password page.",
        "Type your new password twice and confirm.",
        ("Return to the Login page — a message confirms", "Password reset successfully. You can now log in."),
    ])
    screenshot(
        "Forgot Password request screen",
        "Login page \u2192 Forgot password?",
        "The email-entry box used to request a password reset link.")

    h2("2.6  Changing your password (when required)")
    para("Sometimes an administrator flags your account so you must set a new password "
         "before continuing. The Change password page then appears automatically.")
    button_table([
        ("Current password", "Type the password you have now."),
        ("New password", "Type your new password (8+ chars, upper, lower and a number)."),
        ("Eye icon", "Shows or hides the new password."),
        ("Confirm new password", "Type the new password again."),
        ("Update password", "Saves the change. You are then logged out and asked to sign in again."),
    ])
    callout("NOTE", "After a successful change you will see \u201cPassword changed. Sign in "
                    "again on this device.\u201d and be returned to the Login page.")

    h2("2.7  Understanding your dashboard (layout everyone shares)")
    para("Once you log in, every role sees the same overall layout. Learn it once and you "
         "know your way around the whole platform.")
    bullets([
        ("Left sidebar:", "your menu. The items change depending on your role. Click any item to open that page."),
        ("Collapse arrow:", "the small arrow at the top of the sidebar shrinks it to icons only, giving more space. Click again to expand."),
        ("User card:", "your photo/initials, name and email at the top of the sidebar."),
        ("Top header:", "a \u201cWelcome back\u201d greeting on the left."),
        ("Notification bell:", "shows a red count when you have unread notifications; click to read them."),
        ("Role badge:", "a small tag showing your role (e.g. STUDENT)."),
        ("Avatar menu:", "hover or click your photo (top-right) to see your name, email and a Logout button."),
        ("Logout:", "in the avatar menu and at the bottom of the sidebar — signs you out safely."),
    ])
    screenshot(
        "The dashboard layout (sidebar + header)",
        "Log in with any account.",
        "The whole dashboard frame: left sidebar menu, the top header with the notification bell, the role badge and your avatar.")

    h2("2.8  The notification bell")
    para("The bell icon in the header is the same for everyone. A red number means you "
         "have unread messages (for example, a new grade, a scheduled class, or an "
         "account update). Click the bell to open the list, then click a notification to "
         "mark it read.")
    screenshot(
        "Notifications panel",
        "Any dashboard \u2192 click the bell icon in the top header.",
        "The open notifications dropdown showing the list of recent messages.")

    h2("2.9  Editing your profile (all roles)")
    para("Every role has a Profile page reached from the sidebar (named Profile, Profile "
         "Settings, Teacher Profile, and so on). They all work the same way.")
    button_table([
        ("Edit Profile", "Opens the edit dialog."),
        ("Camera icon", "Opens a file picker to upload a new profile photo (JPG/PNG/GIF, max 5 MB)."),
        ("Full Name *", "Edit your name (required)."),
        ("Email *", "Edit your email (required)."),
        ("Phone", "Edit your phone number."),
        ("Address", "Edit your address."),
        ("Cancel", "Closes the dialog without saving."),
        ("Save Changes", "Saves your edits. Shows Saving\u2026 while it works, then a Profile updated confirmation."),
    ])
    h3("Step by step: update your profile")
    steps([
        ("Open your", "Profile page from the sidebar."),
        ("Click", "Edit Profile."),
        ("Optionally click the", "camera icon to choose a new photo."),
        "Change any of Full Name, Email, Phone or Address.",
        ("Click", "Save Changes."),
    ])
    screenshot(
        "Profile page with Edit dialog open",
        "Sidebar \u2192 Profile / Profile Settings \u2192 Edit Profile.",
        "The profile page with the Edit Profile dialog open, showing the photo camera icon and the Full Name, Email, Phone and Address fields.")

    h2("2.10  Logging out")
    para("To leave safely, click your avatar in the top-right corner and choose Logout, "
         "or use the Logout button at the bottom of the sidebar. You are returned to the "
         "Login page. Always log out on shared or public computers.")


# ---------------------------------------------------------------------------
# Reusable "role intro" and "how to sign in as this role"
# ---------------------------------------------------------------------------
def role_sidebar(items):
    h3("Your sidebar menu")
    para("After logging in you will see these items down the left side:")
    bullets(items)


# ===========================================================================
# PART 3 — STUDENT
# ===========================================================================
def build_student():
    h1("The Student Guide", number="Part 3")
    lead("Students are learners. This part shows every screen a student can open, what "
         "each button does, and how to complete the everyday tasks: watching lectures, "
         "joining live classes, taking quizzes, submitting assessments, sitting exams and "
         "collecting certificates.")

    h2("3.1  Signing in as a Student")
    para("Log in with your student email and password (see Part 2). You arrive on the "
         "student Overview page. Your greeting reads \u201cWelcome back, <your name>\u201d and "
         "your role badge shows STUDENT.")
    role_sidebar([
        ("Overview", "your progress at a glance."),
        ("Enrolled Courses", "the courses you can study."),
        ("Login Activity", "your recent sign-ins and devices."),
        ("Live Classes", "scheduled and ongoing live sessions."),
        ("Exams & Assessments", "your exam hub and results."),
        ("Profile Settings", "your personal details."),
    ])

    h2("3.2  Overview (your progress dashboard)")
    para("This is your home screen. It summarises how you are doing across all courses.")
    h3("What you see")
    bullets([
        ("Top stat cards:", "Enrolled, Completed, Avg Progress, Quiz Attempts, Avg Quiz Score."),
        ("Activity cards:", "Live Lectures, Assessments, Exams, Quizzes."),
        ("Charts:", "Quiz Performance Trend, Assessment Status, Live Lectures Analytics and Enrolled Courses."),
    ])
    button_table([
        ("Sync Progress", "Pulls your latest course-completion data from the server and refreshes the numbers. Shows Syncing\u2026 while it works."),
    ])
    screenshot(
        "Student Overview dashboard",
        "Log in as a student (opens automatically), or sidebar \u2192 Overview.",
        "The Overview page showing the stat cards along the top and the four analytics charts below.")

    h2("3.3  Enrolled Courses (My Courses)")
    para("Shows every course you are enrolled in as a grid of cards, each with a progress "
         "bar. If you have more than six courses they are split across pages.")
    button_table([
        ("Course card", "Click anywhere on a card to open that course's details page."),
        ("Progress bar", "Shows your completion percentage; a Completed badge appears at 100%."),
        ("Page numbers / arrows", "Move between pages when you have many courses."),
    ])
    para("If you have not been enrolled yet you will see \u201cNo Courses Yet — You haven't "
         "enrolled in any courses yet.\u201d")
    screenshot(
        "My Courses grid",
        "Sidebar \u2192 Enrolled Courses.",
        "The grid of enrolled-course cards, each showing the course title, instructor and a progress bar.")

    h2("3.4  Inside a course (Course Details)")
    para("Clicking a course opens the Course Details page — the heart of your learning. "
         "Everything for that course lives here, and it is arranged so you complete it in "
         "order.")
    h3("Layout of the page")
    bullets([
        ("Course hero:", "thumbnail, title, who created it, description, and a Back button."),
        ("Video player:", "plays the selected recorded lecture and tracks how much you have watched."),
        ("Recorded Lectures table:", "columns #, Title, Progress, Duration, Status. Click a row to start watching it."),
        ("Assessments section:", "cards with a View & Submit button (or Completed)."),
        ("Quizzes section:", "cards with a Start Quiz button (or Completed)."),
        ("Course Progress card (right):", "progress bars for Lectures, Quizzes and Assessments."),
        ("Exams card (right):", "locked until you finish everything else."),
    ])
    button_table([
        ("Back", "Returns to the previous page."),
        ("Lecture row", "Loads and plays that recorded lecture."),
        ("View & Submit", "Opens an assessment so you can submit your work."),
        ("Start Quiz", "Begins a quiz attempt (disabled once completed)."),
        ("Start Exam", "Appears when exams unlock; begins the exam."),
        ("Already Attempted / Complete Requirements", "Shown instead of Start Exam when you cannot start yet."),
    ])
    h3("How exams unlock")
    para("The Exams section stays Locked until all three progress bars are complete. The "
         "on-screen note reads \u201cTo unlock exams, complete: All lectures (95%+ each), All "
         "quizzes, All assessments.\u201d Watch each lecture to at least 95%, finish every "
         "quiz, and submit every assessment — then the exams open.")
    screenshot(
        "Course Details with video player and lecture list",
        "Enrolled Courses \u2192 click a course.",
        "The course page: the video player on the left with the Recorded Lectures table beneath it, and the Course Progress and Exams cards on the right.")
    callout("TIP", "The Status column shows a green tick when a lecture is complete. Aim to "
                   "turn every row green to unlock your exams.")

    h2("3.5  Live Classes (join a live session)")
    para("The Live Classes page lists your scheduled, ongoing and finished live lectures. "
         "You can switch between a grid view and a table view with the small view-toggle "
         "button.")
    button_table([
        ("View toggle", "Switches between grid cards and a table list."),
        ("Join Now / Join", "Enters a class that is currently ongoing (green badge)."),
        ("Not Started / Ended / Closed", "Shown when a class cannot be joined yet or is over."),
    ])
    h3("Status badges")
    bullets([
        ("upcoming", "(blue) — scheduled for later."),
        ("ongoing", "(green) — happening now; you can join."),
        ("ended", "(grey) — finished."),
    ])
    h3("Step by step: join a live class")
    steps([
        ("Open", "Live Classes from the sidebar."),
        ("Find a class showing the green", "ongoing badge."),
        ("Click", "Join Now (grid) or Join (table)."),
        "On the pre-join screen, click Join Classroom.",
        "Your camera and microphone activate and you enter the live video room.",
        ("When finished, click", "Leave to exit."),
    ])
    screenshot(
        "Live Classes list",
        "Sidebar \u2192 Live Classes.",
        "The list of live lectures with their status badges and the Join Now button on an ongoing class.")
    screenshot(
        "Inside the live classroom",
        "Live Classes \u2192 Join Now \u2192 Join Classroom.",
        "The live video room: the teacher's video, the participant panel toggle, the Copy classroom link icon and the Leave button.")

    h2("3.6  Quizzes")
    para("Quizzes are quick, usually timed tests that are scored instantly. You can start "
         "them from inside a course, or from the Available Quizzes list.")
    h3("Available Quizzes list")
    button_table([
        ("Start Quiz", "Creates your attempt and opens the quiz."),
    ])
    para("Each card shows the quiz title, description and Time Limit. If none are ready "
         "you will see \u201cNo quizzes available.\u201d")

    h3("Taking a quiz (Quiz Attempt)")
    button_table([
        ("Time Left: MM:SS", "A live countdown. The quiz auto-submits when it hits zero (turns red under 5 minutes)."),
        ("Option buttons", "Select your answer for multiple-choice / true-false questions."),
        ("Type your answer here\u2026", "A text box for written (subjective) questions."),
        ("Cancel", "Leaves the quiz — you are warned that your progress will be lost."),
        ("Submit Quiz", "Sends all your answers and opens your results."),
    ])
    h3("Step by step: attempt a quiz")
    steps([
        ("Click", "Start Quiz on a quiz card (in a course or the quiz list)."),
        "Answer each question — select an option or type your answer.",
        "Keep an eye on the Time Left countdown.",
        ("Click", "Submit Quiz (or let it auto-submit at zero)."),
        "You are taken to the Quiz Results page.",
    ])
    screenshot(
        "Quiz attempt screen",
        "A course or Quizzes list \u2192 Start Quiz.",
        "The quiz-taking page: a question with answer options, the Time Left countdown at the top, and the Submit Quiz button.")

    h3("Quiz Results")
    para("After submitting, the Quiz Results page shows your Status, Your Score, and "
         "Percentage, with a coloured bar (green for pass, red for fail). Scroll down to "
         "Question Details to see, per question, Your Answer and — if you were wrong — the "
         "Correct Answer.")
    screenshot(
        "Quiz Results",
        "Automatically shown after you submit a quiz.",
        "The results page with the score, percentage, pass/fail bar and the per-question breakdown.")

    h2("3.7  Assessments (assignments)")
    para("Assessments are assignments you submit and a teacher grades. Open My "
         "Assessments (or the Assessments tab in your exam hub) to see all of them across "
         "your courses.")
    button_table([
        ("Start Assessment", "Opens the assessment so you can read it and submit your work."),
        ("Past Due (red)", "Marks assessments whose due date has passed."),
    ])
    h3("Submitting an assessment (Assessment Details)")
    para("Each assessment shows its Due Date, Total Marks, Type (File Upload or Text "
         "Entry) and a Status badge (NOT SUBMITTED, SUBMITTED or GRADED).")
    button_table([
        ("Upload File", "For File Upload type — choose your file (max 10 MB)."),
        ("Your Answer", "For Text Entry type — type your answer."),
        ("Submit Assignment", "Sends your work. Shows Submitting\u2026 then a success message."),
        ("Back to Assessments", "Returns to the assessment list."),
    ])
    h3("Step by step: submit an assessment")
    steps([
        ("From", "My Assessments, click Start Assessment on the one you want."),
        "Read the description, due date and marks.",
        "If it is File Upload, choose a file (max 10 MB). If it is Text Entry, type your answer.",
        ("Click", "Submit Assignment."),
        ("The status changes to", "SUBMITTED. Come back later to see your grade and feedback once it turns GRADED."),
    ])
    screenshot(
        "Assessment submission page",
        "My Assessments \u2192 Start Assessment.",
        "The assessment details with the file-upload box or answer text area and the Submit Assignment button.")
    callout("NOTE", "Once graded, this same page shows Your Grade, the date it was graded, "
                    "and the teacher's Feedback.")

    h2("3.8  Exams & Assessments (the exam hub)")
    para("Opening Exams & Assessments shows the Exam Dashboard with two tabs: Available "
         "Exams and My Attempts.")
    h3("Available Exams")
    button_table([
        ("View toggle", "Switch between grid and table."),
        ("Start Exam / Start", "Begins a proctored exam."),
        ("Already attempted", "Shown in red when you have used all your attempts."),
    ])
    h3("My Attempts")
    para("Lists every exam you have taken with a status badge: Passed (green), Failed "
         "(red) or Pending (yellow, still being evaluated).")
    screenshot(
        "Exam Dashboard — Available Exams tab",
        "Sidebar \u2192 Exams & Assessments.",
        "The exam hub with the Available Exams and My Attempts tabs, showing exam cards with the Start Exam button.")

    h2("3.9  Taking a proctored exam")
    para("Exams are serious, camera-monitored tests. Before starting, read the "
         "instructions screen carefully — it lists the rules and shows the Duration, Total "
         "Marks and Passing Marks.")
    h3("The rules you must follow")
    bullets([
        "Stay in full-screen mode throughout the exam.",
        "Do not switch tabs, minimise the window, or navigate away.",
        "Your webcam and microphone are recorded for proctoring.",
        "Answer all questions before the time expires.",
        "The exam auto-submits when time runs out.",
        "3 violations will result in automatic submission.",
        "Once cancelled, you cannot retake the exam.",
        "Results are emailed within 24\u201348 hours.",
    ])
    button_table([
        ("Start Exam", "Enters full-screen and starts camera recording and the timer."),
        ("Go Back", "Returns to the exam list without starting."),
        ("Previous / Next", "Move between questions."),
        ("Submit Exam", "On the last question — submits all answers."),
        ("Cancel Exam", "Abandons the attempt (you cannot retake it)."),
        ("Retry Camera", "Re-attempts camera access if it failed."),
        ("Show / hide video (eye icon)", "Toggles the monitoring video preview."),
    ])
    h3("Step by step: sit an exam")
    steps([
        ("From Available Exams, click", "Start Exam."),
        "Read the instructions and rules.",
        ("Click", "Start Exam — the screen goes full-screen and recording begins."),
        "Answer each question; move with Previous and Next.",
        ("On the last question, click", "Submit Exam."),
        ("You see", "Exam Completed — results arrive by email in 24\u201348 hours."),
    ])
    screenshot(
        "The proctored exam start screen (rules & instructions)",
        "Exams & Assessments \u2192 Available Exams \u2192 Start.",
        "The exam start screen: Duration, Total Marks and Passing Marks, plus the full list of proctoring rules and the Start Exam button. Once started, the live question view with the countdown timer and Live Monitoring camera preview appears.")
    callout("WARNING", "Every time you leave full-screen or switch tabs it counts as a "
                       "violation. After 3 violations the exam submits itself automatically. "
                       "Stay on the exam screen the whole time.")

    h2("3.10  Login Activity (your sessions)")
    para("Login Activity lists the devices and times you have signed in. You can end any "
         "session remotely — useful if you signed in on someone else's device.")
    button_table([
        ("TOTAL / ACTIVE / EXPIRED", "Counts of your sessions."),
        ("View toggle", "Switch between table and cards."),
        ("End / End Session", "Signs that device out. You are asked to confirm first."),
    ])
    screenshot(
        "Login Activity",
        "Sidebar \u2192 Login Activity.",
        "The list of your sign-in sessions with device, IP, time and the End button.")

    h2("3.11  Certificates")
    para("When you complete a course and any required exam, staff can issue you a "
         "certificate. Anyone can confirm it is genuine on the public Verify Certificate "
         "page by entering the certificate ID — see Part 8.")


# ===========================================================================
# PART 4 — TEACHER
# ===========================================================================
def build_teacher():
    h1("The Teacher Guide", number="Part 4")
    lead("Teachers deliver the learning. This part covers every teacher screen: the "
         "dashboard, live classes, uploading and managing recorded lectures, building "
         "quizzes and exams, creating and grading assessments, and issuing certifications.")

    h2("4.1  Signing in as a Teacher")
    para("Log in with your teacher account. You land on the Teacher Dashboard and your "
         "role badge shows TEACHER.")
    role_sidebar([
        ("Dashboard", "your teaching overview and analytics."),
        ("Live Lectures", "start or re-enter your live classes."),
        ("My Courses", "your assigned courses; upload lectures."),
        ("Manage Quizzes", "create and manage quizzes."),
        ("Assessments", "create and grade assignments."),
        ("Certifications", "issue and manage certificates."),
        ("Exams", "create and run exams."),
        ("Recorded Lectures", "manage existing lecture videos."),
        ("Profile", "your personal details."),
    ])

    h2("4.2  Teacher Dashboard")
    para("Your home screen summarises your teaching activity in stat cards and charts.")
    bullets([
        ("Stat cards:", "Total Courses, Published, Drafts, Total Quizzes, Quiz Submissions, Total Lectures, Upcoming, Past Lectures, Enrollments, New This Month, Avg Progress."),
        ("Charts:", "Course Distribution, Enrollment Comparison, Student Progress by Course, Quiz Submissions Over Time."),
        ("Course Enrollments table:", "columns Course, Student, Progress, Status, Last Activity."),
    ])
    button_table([
        ("All Courses + course pills", "Filter the enrolment table to a single course or show all."),
    ])
    screenshot(
        "Teacher Dashboard",
        "Log in as a teacher (opens automatically).",
        "The dashboard with the row of stat cards, the four charts, and the Course Enrollments table below.")

    h2("4.3  Live Lectures (running a class)")
    para("This page lists the live classes assigned to you, newest and live ones first. "
         "You start a scheduled class or rejoin one already running here.")
    button_table([
        ("Refresh", "Reloads your list of classes."),
        ("Start live class", "Begins a scheduled class and opens the live classroom."),
        ("Re-enter live class", "Rejoins a class that is already live (green)."),
        ("Class ended", "Greyed out; the class is over."),
    ])
    h3("Status badges")
    bullets([("Live now", "(green), scheduled (blue), ended (grey)")])
    h3("Step by step: start a live class")
    steps([
        ("Open", "Live Lectures."),
        ("Find a card with the", "scheduled badge."),
        ("Click", "Start live class — the live classroom opens."),
        "Teach; students join from their side.",
        ("If you dropped out, click", "Re-enter live class to return."),
    ])
    para("If you have no classes you will see \u201cNo classes scheduled — An administrator "
         "can schedule a class and assign it to you.\u201d")
    screenshot(
        "Teacher Live Lectures",
        "Sidebar \u2192 Live Lectures.",
        "The live-class cards with their status badges and the Start live class button.")
    callout("NOTE", "Only an Admin or Super Admin schedules live lectures and assigns them "
                    "to you. You start and run the class once it appears here.")

    h2("4.4  My Courses (upload a lecture)")
    para("Shows the courses assigned to you and a form to add a new recorded lecture.")
    h3("Upload a New Lecture — form fields")
    button_table([
        ("Lecture Title", "Name of the lecture, e.g. \u201cIntroduction to React\u201d."),
        ("Select Course", "Choose which of your courses it belongs to."),
        ("Duration (seconds)", "Length of the video in seconds."),
        ("Lecture Order", "Where it sits in the course sequence (1, 2, 3\u2026)."),
        ("Description", "A short summary of the lecture."),
        ("Video File", "Choose the video file to upload."),
        ("Upload Lecture", "Uploads it. Shows Uploading\u2026 then a success toast."),
    ])
    para("Below the form, the Assigned Courses table lists your courses with pagination "
         "(Prev / Next).")
    screenshot(
        "Teacher My Courses upload form",
        "Sidebar \u2192 My Courses.",
        "The Upload a New Lecture form with the title, course, duration, order, description and video-file fields, and the Assigned Courses table below.")

    h2("4.5  Recorded Lectures (manage existing videos)")
    para("Here you manage the lectures already uploaded to each course — viewing student "
         "progress, editing details, adding more, and deleting.")
    button_table([
        ("Add Lecture / Add First Lecture", "Opens the inline upload form for that course."),
        ("Upload Lecture", "Submits the new lecture."),
        ("Edit (pencil)", "Edit a lecture's title or duration."),
        ("Update", "Saves your edits."),
        ("Delete (trash)", "Removes a lecture after a confirmation."),
        ("View Progress / Hide Progress", "Shows or hides each student's progress on that lecture."),
        ("Cancel / X", "Closes the inline form."),
    ])
    para("Deleting asks \u201cDelete Lecture? This action cannot be undone.\u201d with Cancel "
         "and Delete. Each lecture shows a colour-coded average progress badge.")
    screenshot(
        "Recorded Lectures management",
        "Sidebar \u2192 Recorded Lectures.",
        "A course card expanded to show its lectures with the Edit, Delete and View Progress controls.")

    h2("4.6  Manage Quizzes")
    para("Create, edit, publish and delete quizzes, and open their questions, analytics "
         "and submissions.")
    button_table([
        ("New Quiz", "Opens the Create New Quiz form."),
        ("View toggle", "Switch table and card views."),
        ("Quiz title", "Click to open the quiz details."),
        ("Edit", "Edit the quiz."),
        ("Questions", "Open the questions manager for that quiz."),
        ("Analytics", "See per-question difficulty and cohort performance."),
        ("Submissions", "View who has attempted it."),
        ("Publish", "Publishes a DRAFT quiz so students can see it."),
        ("Delete", "Permanently deletes the quiz (with confirmation)."),
        ("Prev / Next", "Move between pages (5 per page)."),
    ])
    para("Status badges: PUBLISHED (green) and DRAFT (amber).")
    h3("Create New Quiz — form")
    button_table([
        ("Select Course", "Which course the quiz belongs to."),
        ("Quiz Title", "The quiz name."),
        ("Description", "What the quiz covers."),
        ("Time Limit (minutes)", "How long students get (default 10)."),
        ("Create Quiz / Update Quiz", "Saves the quiz."),
        ("Cancel", "Closes without saving."),
    ])
    screenshot(
        "Manage Quizzes list",
        "Sidebar \u2192 Manage Quizzes.",
        "The quiz table with the New Quiz button and the per-row Edit, Questions, Analytics, Submissions, Publish and Delete actions.")

    h3("Adding questions to a quiz")
    para("From a quiz's Questions page you add questions one by one, or many at once.")
    button_table([
        ("Question Text", "The question itself."),
        ("Marks", "Points for the question (min 1)."),
        ("Option 1, Option 2\u2026", "Answer choices; the radio button marks the correct one."),
        ("Add Option", "Adds another choice (up to 5)."),
        ("Add Question", "Saves this single question."),
        ("Bulk Add Questions", "Opens the paste-many-questions window."),
    ])
    h3("Bulk Add Questions format")
    para("In the bulk window you paste questions in this format, then click Parse & "
         "Preview and finally Save All Questions:")
    bullets([
        ("Format:", "Question text <marks> / Option 1 / *Correct Option / Option 3"),
        ("Example:", "What is 2+2? <10 marks> / *4 / 2 / 3   (the * marks the correct answer)"),
    ])
    screenshot(
        "Quiz questions manager",
        "Manage Quizzes \u2192 Questions on a quiz.",
        "The Add New Question form with option fields and correct-answer radios, plus the Bulk Add Questions button.")

    h2("4.7  Assessments (create & grade)")
    para("Assessments are assignments students submit and you grade with a mark and "
         "feedback.")
    h3("Manage Assessments")
    button_table([
        ("New Assessment", "Opens the Create Assessment form."),
        ("Assessment title", "Opens its details."),
        ("Submissions", "Opens the grading page for that assessment."),
        ("Analytics", "Shows averages and grade spread."),
        ("Edit", "Edit the assessment."),
        ("Bulk Add", "Paste many assessment questions at once."),
        ("Assign", "Give an assistant grading access (by email)."),
        ("Delete", "Removes the assessment (with confirmation)."),
    ])
    h3("Create Assessment — form")
    button_table([
        ("Course", "Which course it belongs to."),
        ("Title", "The assessment name (required)."),
        ("Description", "Instructions for students."),
        ("Due Date", "When it must be submitted by."),
        ("Total Marks", "Maximum marks (default 100)."),
        ("Submission Type", "File Upload or Text Entry."),
        ("+ Add Another Question", "Add embedded questions."),
        ("Save Assessment", "Creates or updates the assessment."),
    ])
    screenshot(
        "Manage Assessments",
        "Sidebar \u2192 Assessments.",
        "The assessments table with New Assessment and the per-row Submissions, Analytics, Edit, Bulk Add, Assign and Delete actions.")

    h3("Grading submissions")
    para("From an assessment's Submissions page you see every student's work and give "
         "grades.")
    button_table([
        ("Back", "Return to the assessment list."),
        ("View Submission", "Opens the student's file or text."),
        ("Grade / View/Edit Grade", "Opens the grading box."),
        ("Grade", "Type the numeric mark."),
        ("Feedback", "Type comments for the student."),
        ("Submit Grade", "Saves the mark and feedback."),
        ("Cancel", "Closes without saving."),
    ])
    para("Badges: SUBMITTED (yellow) and GRADED (green).")
    h3("Step by step: grade an assessment")
    steps([
        ("Open", "Assessments \u2192 Submissions on the one you want."),
        ("Click", "View Submission to read the student's work."),
        ("Click", "Grade."),
        "Enter a mark in Grade and comments in Feedback.",
        ("Click", "Submit Grade — a success toast confirms it."),
    ])
    screenshot(
        "Grade submissions page",
        "Assessments \u2192 Submissions.",
        "The submissions table with View Submission and Grade actions, and the grading box with the Grade and Feedback fields.")

    h2("4.8  Exams")
    para("The Manage Exams hub lets you build formal exams, add questions, publish them, "
         "view statistics, upload questions in bulk, email results, and evaluate pending "
         "submissions.")
    button_table([
        ("Search exams\u2026", "Filter exams by title or course."),
        ("Add Exam", "Create a new exam."),
        ("Scores", "Open the All Exam Scores table."),
        ("Pending", "Refresh the list of attempts awaiting evaluation."),
        ("Details (eye)", "View exam details."),
        ("Edit (pencil)", "Edit the exam."),
        ("Bulk Upload", "Upload many questions at once."),
        ("Send Results (mail)", "Email results to that exam's students."),
        ("Stats (chart)", "View pass/fail statistics."),
        ("Questions (?)", "Manage the exam's questions."),
        ("Publish (send)", "Publish a DRAFT exam to enrolled learners."),
        ("Delete (trash)", "Delete the exam (with confirmation)."),
    ])
    para("Exam badges: PUBLISHED (green), DRAFT (amber). Question badges: MCQ (blue), "
         "SUBJECTIVE (green).")
    screenshot(
        "Manage Exams",
        "Sidebar \u2192 Exams.",
        "The exams table with the Add Exam button, the search box, and the per-row Details, Edit, Bulk Upload, Send Results, Stats, Questions, Publish and Delete icons.")
    callout("NOTE", "Subjective answers are not auto-marked. Use the Pending list and the "
                    "Evaluate Attempt screen to grade them by hand, then send scores.")

    h2("4.9  Certifications")
    para("The Certifications page (shared with Assistant, Admin and Super Admin) lets you "
         "issue certificates to students who have completed a course, and revoke them if "
         "needed. Each certificate gets an ID that anyone can verify publicly (Part 8).")
    screenshot(
        "Manage Certifications",
        "Sidebar \u2192 Certifications.",
        "The certifications screen where certificates are issued to students and listed.")


# ===========================================================================
# PART 5 — ASSISTANT
# ===========================================================================
def build_assistant():
    h1("The Assistant Guide", number="Part 5")
    lead("Assistants are grading helpers. They focus on marking assessments and looking "
         "after quizzes, exams and certifications assigned to them. Their screens are a "
         "focused subset of the Teacher's tools.")

    h2("5.1  Signing in as an Assistant")
    para("Log in with your assistant account. You arrive on the Assistant Dashboard; your "
         "role badge shows ASSISTANT.")
    role_sidebar([
        ("Dashboard", "your grading workload and metrics."),
        ("Quiz Management", "manage quizzes and their questions."),
        ("Assessments", "grade student submissions."),
        ("Certifications", "issue and manage certificates."),
        ("Exams", "manage and evaluate exams."),
        ("Profile", "your personal details."),
    ])

    h2("5.2  Assistant Dashboard")
    para("Your dashboard is built around your grading workload.")
    bullets([
        ("Action Required alert:", "appears in red when items are urgent or overdue."),
        ("Stat cards:", "ASSIGNED, PENDING GRADING, COMPLETED / WEEK, AVG. TIME, STUDENTS, DAILY TARGET."),
        ("Assessment Workload chart:", "pending submissions per assessment."),
        ("Recent Grading Activity:", "your latest graded submissions."),
        ("Courses Supported:", "the courses you help with."),
        ("Notifications:", "your unread alerts."),
    ])
    screenshot(
        "Assistant Dashboard",
        "Log in as an assistant (opens automatically).",
        "The dashboard with the six workload stat cards, the Assessment Workload chart, and the Courses Supported and Notifications panels.")

    h2("5.3  Grading assessments")
    para("Open Assessments to see the assessments assigned to you and grade student "
         "submissions. The grading flow is identical to the teacher's (see 4.7): open "
         "Submissions, click View Submission, then Grade, enter a mark and feedback, and "
         "click Submit Grade.")
    screenshot(
        "Assistant grading a submission",
        "Sidebar \u2192 Assessments \u2192 Submissions \u2192 Grade.",
        "The grading box with the student's submission, the Grade field and the Feedback field.")

    h2("5.4  Quiz Management, Exams & Certifications")
    para("These pages are the same as the teacher's versions:")
    bullets([
        ("Quiz Management:", "create and edit quizzes and their questions (see 4.6)."),
        ("Exams:", "manage exams and evaluate pending attempts (see 4.8)."),
        ("Certifications:", "issue and manage certificates (see 4.9)."),
    ])

    h2("5.5  Profile")
    para("The Assistant Profile page works exactly like every other profile (see 2.9): "
         "click Edit Profile, update your details or photo, and click Save Changes.")


# ===========================================================================
# PART 6 — ADMIN
# ===========================================================================
def build_admin():
    h1("The Admin Guide", number="Part 6")
    lead("Admins run the platform day to day: creating and managing users and courses, "
         "handling enrolments, answering support tickets, and overseeing quizzes, "
         "assessments, exams and certifications.")

    h2("6.1  Signing in as an Admin")
    para("Log in with your admin account. You land on the Dashboard Overview; your role "
         "badge shows ADMIN.")
    role_sidebar([
        ("Dashboard", "platform-wide overview and quick actions."),
        ("Users", "view, edit and delete users."),
        ("Courses", "create and manage courses; assign teachers; enrol students."),
        ("Manage Quizzes", "quizzes across courses."),
        ("Manage Exams", "exams across courses."),
        ("Assessments", "assessments across courses."),
        ("Certifications", "certificates."),
        ("Support", "answer help-desk tickets."),
        ("Profile", "your personal details."),
    ])

    h2("6.2  Dashboard Overview")
    para("A bird's-eye view of the whole platform.")
    bullets([
        ("Top stat cards:", "New Users This Month, Total Courses, Enrollments, Assessments."),
        ("Charts:", "User Distribution, Course Status, Quiz Overview, Lectures, Assessment Progress Trend, Assessment Submissions."),
        ("Bottom stat cards:", "Total Enrollments, Avg Progress, Total Assessments, Submissions, Total Lectures."),
    ])
    button_table([
        ("Refresh", "Reloads all dashboard data."),
        ("Manage Users", "Quick link to the Users page."),
        ("Manage Courses", "Quick link to Courses."),
        ("Manage Quizzes", "Quick link to Quizzes."),
        ("Assessments", "Quick link to Assessments."),
    ])
    screenshot(
        "Admin Dashboard Overview",
        "Log in as an admin (opens automatically).",
        "The overview with the stat cards, the six charts and the Quick Actions panel.")

    h2("6.3  Users")
    para("The Users page lists everyone on the platform. You can search, filter, edit and "
         "delete users.")
    button_table([
        ("Search users\u2026", "Find a user by name or email."),
        ("Role / Verified / Suspended / Course Done", "Filter the list."),
        ("View toggle", "Switch table and card views."),
        ("Edit (pencil)", "Open the full edit form for a user."),
        ("Delete (trash)", "Delete a user (asks to confirm)."),
        ("Prev / Next", "Move between pages."),
    ])
    h3("Editing a user")
    para("The edit form (\u201cEdit User: <name>\u201d) exposes every field: Name, Email, Phone, "
         "Just Easy ID, Course Name, Gender, Date of Birth, Department, Year, Guardian "
         "Phone, Attendance %, Grade, Address and Feedback, plus checkboxes for is "
         "Verified, is Suspended, force Password Change, is Deleted and completed Course. "
         "Click Save changes to apply.")
    screenshot(
        "Users management table",
        "Sidebar \u2192 Users.",
        "The users table with the search box, the Role/Verified/Suspended filters, and the per-row Edit and Delete icons.")
    screenshot(
        "Edit User dialog",
        "Users \u2192 Edit (pencil) on any user.",
        "The Edit User form showing the personal fields and the status checkboxes with the Save changes button.")

    h2("6.4  Courses")
    para("The Courses page is where you create courses and manage everything about them.")
    button_table([
        ("New Course", "Create a course."),
        ("Enroll", "Open the student-enrolment window."),
        ("View toggle", "Switch table and grid views."),
        ("View", "Open a course's detail page."),
        ("Edit", "Edit the course."),
        ("Enroll (row)", "Enrol a student into that course."),
        ("Upload", "Upload recorded lectures to that course."),
        ("Teachers", "See which teachers are assigned."),
        ("Assign", "Assign a teacher to the course (by email)."),
        ("Delete", "Delete the course (with confirmation)."),
    ])
    h3("Create a course")
    steps([
        ("Click", "New Course."),
        "Fill in Course Title, Description, optional thumbnail, and Start/End dates.",
        ("Tick", "Publish immediately if it should be live at once."),
        ("Click", "Create Course."),
    ])
    h3("Assign a teacher")
    steps([
        ("On the course row, click", "Assign."),
        ("Enter the", "Teacher's Email."),
        ("Click", "Assign Teacher."),
    ])
    screenshot(
        "Courses management",
        "Sidebar \u2192 Courses.",
        "The courses table with New Course and the per-row View, Edit, Enroll, Upload, Teachers, Assign and Delete actions.")
    screenshot(
        "Create New Course dialog",
        "Courses \u2192 New Course.",
        "The Create New Course form with the title, description, thumbnail, dates and Publish immediately checkbox.")

    h2("6.5  Enrolments")
    para("Enrolments link students to courses. Although the Enrolments page sits under "
         "Super Admin, Admins manage enrolments from the Courses page's Enroll windows. "
         "The enrolment window lets you enrol by Student Email or by User ID.")
    h3("Enrol a student")
    steps([
        ("Click", "Enroll (top of Courses, or on a course row)."),
        ("Choose", "Select Course if needed."),
        ("Pick", "By Email or By User ID."),
        "Type the student's email or 24-character user ID.",
        ("Click", "Enroll Student."),
    ])
    screenshot(
        "Student Enrollment dialog",
        "Courses \u2192 Enroll.",
        "The Student Enrollment window with the course dropdown, the By Email / By User ID choice and the Enroll Student button.")

    h2("6.6  Support (help desk)")
    para("The Support page is your ticket inbox. Users submit grievances and questions; "
         "you read and respond to them here.")
    button_table([
        ("Reference, email, or subject", "Search tickets."),
        ("Status filter", "All statuses, OPEN, IN_PROGRESS, WAITING_FOR_USER, RESOLVED, CLOSED."),
        ("Ticket row", "Click to open the ticket detail panel."),
        ("Status dropdown", "Change the ticket's status."),
        ("Response or resolution note", "Type your reply to the user."),
        ("Save and notify requester", "Saves and emails the user your response."),
        ("Close panel", "Closes the detail panel."),
    ])
    h3("Step by step: answer a ticket")
    steps([
        ("Open", "Support."),
        "Click a ticket row to read the user's message.",
        ("Set the", "Status (e.g. IN_PROGRESS or RESOLVED)."),
        ("Type a reply in", "Response or resolution note."),
        ("Click", "Save and notify requester."),
    ])
    screenshot(
        "Support tickets",
        "Sidebar \u2192 Support.",
        "The support inbox: the ticket table on top and the detail panel with the status dropdown, reply box and Save and notify requester button.")

    h2("6.7  Sessions (all users)")
    para("Admins can also review every active login session across all users and end any "
         "of them. Use the search box, then click Terminate on any session. (Reached via "
         "the same Sessions tools used by Super Admin — see 7.7.)")

    h2("6.8  Quizzes, Exams, Assessments & Certifications")
    para("These pages are shared with teachers and work the same way — create, edit, "
         "publish, grade and analyse (see Part 4). As an Admin you can manage them across "
         "all courses, not just your own.")

    h2("6.9  Profile")
    para("Your Admin Profile works like every other profile (see 2.9).")


# ===========================================================================
# PART 7 — SUPER ADMIN
# ===========================================================================
def build_superadmin():
    h1("The Super Admin Guide", number="Part 7")
    lead("Super Admin is the owner-level role with full control. It includes everything "
         "an Admin can do, plus scheduling live lectures, bulk user registration, data "
         "exports, and system-wide settings such as maintenance mode and promoting users.")

    h2("7.1  Signing in as a Super Admin")
    para("Log in with your super-admin account. You land on the Super Admin Dashboard; "
         "your role badge shows SUPER_ADMIN.")
    role_sidebar([
        ("Dashboard", "complete platform overview."),
        ("Users", "manage every user."),
        ("Courses", "manage every course."),
        ("Sessions", "all active login sessions."),
        ("Bulk Register", "add users one-by-one or via Excel."),
        ("Enrollments", "every enrolment across the platform."),
        ("Live Lecture", "schedule live classes and assign teachers."),
        ("Manage Quizzes / Manage Exams / Assessments", "content tools."),
        ("Certifications", "certificates."),
        ("Export Data", "download platform data."),
        ("Support", "help-desk tickets."),
        ("Settings", "system-wide configuration."),
        ("Profile", "your personal details."),
    ])

    h2("7.2  Super Admin Dashboard")
    para("The most complete overview in the platform.")
    bullets([
        ("Top cards:", "Total Users, Total Courses, Enrollments, Assessments."),
        ("Charts:", "User Distribution, Course Status, Quiz Overview, Lectures, Enrollment Progress Trend, Assessment Submissions, Enrollment Metrics."),
        ("Bottom cards:", "Students, Teachers, Avg Progress, Total Quizzes, Quiz Submissions, Total Lectures."),
        ("Quick Actions:", "Users, Courses, Sessions, Bulk Register, Exports, Settings, Refresh."),
    ])
    screenshot(
        "Super Admin Dashboard",
        "Log in as a super admin (opens automatically).",
        "The full overview with all stat cards, the charts, and the Quick Actions grid.")

    h2("7.3  Scheduling a Live Lecture")
    para("Only Super Admins schedule live classes. Open Live Lecture, pick a course, "
         "choose a teacher, and set the times.")
    button_table([
        ("Search courses\u2026", "Find a course."),
        ("View toggle", "Switch table and grid."),
        ("Assign & Start", "Open the scheduling window for that course."),
        ("Teacher *", "Choose the teacher who will run the class."),
        ("Start Time *", "When the class begins."),
        ("End Time *", "When the class ends."),
        ("Start Lecture", "Creates the scheduled live class."),
        ("Cancel", "Closes the window."),
    ])
    h3("Step by step: schedule a live lecture")
    steps([
        ("Open", "Live Lecture."),
        ("Find the course and click", "Assign & Start."),
        ("Choose a", "Teacher."),
        ("Set", "Start Time and End Time."),
        ("Click", "Start Lecture — a \u201cLive lecture scheduled\u201d message confirms it."),
    ])
    screenshot(
        "Schedule a live lecture",
        "Sidebar \u2192 Live Lecture \u2192 Assign & Start.",
        "The Assign Teacher & Schedule window with the Teacher dropdown, Start Time and End Time fields and the Start Lecture button.")

    h2("7.4  Bulk Register users")
    para("Add users individually or import many at once from an Excel file.")
    h3("Single User tab")
    button_table([
        ("Full Name / Email / Phone / Bio", "The new user's details."),
        ("Account role", "Student, Assistant, Teacher, Administrator or Super administrator."),
        ("Register User", "Creates the account and emails a 24-hour setup link."),
    ])
    h3("Bulk Upload tab")
    button_table([
        ("Choose Excel File", "Select an .xlsx / .xls file of users."),
        ("Register Users", "Imports everyone in the file."),
    ])
    para("After a bulk import you get a summary: Processed, Registered, Skipped and "
         "Failed, with lists of successes and any errors.")
    screenshot(
        "Bulk Register — Single User",
        "Sidebar \u2192 Bulk Register.",
        "The Register New User form with the Account role dropdown and the Register User button, plus the Single User / Bulk Upload tabs.")
    screenshot(
        "Bulk Register — Excel upload summary",
        "Bulk Register \u2192 Bulk Upload \u2192 Register Users.",
        "The Registration Summary showing the Processed, Registered, Skipped and Failed counts after an Excel import.")
    callout("NOTE", "Only Super Admins can create Administrator and Super administrator "
                    "accounts. Admins can create Students, Assistants and Teachers.")

    h2("7.5  Enrolments")
    para("The Enrollments page lists every enrolment on the platform. You can search, "
         "view a course, enrol yourself or another user, and open any student's progress.")
    button_table([
        ("Fetch Users", "Load the user list for the Select a user dropdown."),
        ("Select a user", "Pick a user to enrol."),
        ("Search enrollments\u2026", "Filter the list."),
        ("View", "Open the course details."),
        ("Enroll Me", "Enrol yourself into that course."),
        ("Enroll User", "Enrol the selected user into that course."),
        ("Progress", "Open that student's progress page."),
    ])
    screenshot(
        "All Enrolments",
        "Sidebar \u2192 Enrollments.",
        "The enrolments table with the Fetch Users / Select a user controls and the per-row View, Enroll and Progress actions.")

    h2("7.6  Export Data")
    para("Download platform data as CSV or Excel. Exports are grouped into Users, "
         "Content, Assessments and System.")
    button_table([
        ("CSV", "Download that data type as a CSV file."),
        ("Excel", "Download that data type as an Excel file."),
        ("Complete Export (Excel)", "All data in one Excel workbook."),
        ("Users Report", "Users as Excel."),
        ("System Analytics", "System statistics as Excel."),
    ])
    screenshot(
        "Export Dashboard",
        "Sidebar \u2192 Export Data.",
        "The export cards grouped by category, each with CSV and Excel buttons, plus the Quick Export Actions row.")

    h2("7.7  Sessions (all users)")
    para("The Sessions page shows every active login session across all users. Search "
         "sessions, and click Terminate to force-log-out any device. Handy for security.")
    screenshot(
        "Active Sessions (all users)",
        "Sidebar \u2192 Sessions.",
        "The sessions table listing user, IP, device, login time, status and the Terminate button.")

    h2("7.8  System Settings")
    para("System Settings controls platform-wide behaviour. There are three cards.")
    h3("Maintenance Mode")
    button_table([
        ("Enable Maintenance / Disable Maintenance", "Turns maintenance mode on or off. When on, only admins and whitelisted users can access the platform."),
        ("Search by name or email\u2026 + Add", "Whitelist a user so they keep access during maintenance."),
        ("Remove (x)", "Remove a user from the whitelist."),
    ])
    h3("Promote User")
    button_table([
        ("Search users\u2026", "Find the user to change."),
        ("Select Role", "Student, Teacher, Assistant, Admin or Super Admin."),
        ("Promote User", "Changes that user's role."),
    ])
    h3("System Settings (key-values)")
    button_table([
        ("Save Settings", "Saves any custom system key-value settings."),
    ])
    h3("Step by step: put the site into maintenance")
    steps([
        ("Open", "Settings."),
        ("In the Maintenance card, whitelist any staff who need access using", "Add."),
        ("Click", "Enable Maintenance — the button turns red reading Disable Maintenance."),
        ("To restore normal access, click", "Disable Maintenance."),
    ])
    screenshot(
        "System Settings",
        "Sidebar \u2192 Settings.",
        "The three settings cards: Maintenance Mode with its whitelist, Promote User, and System Settings.")
    callout("WARNING", "Enabling maintenance mode blocks normal students and (non-whitelisted) "
                       "staff from using the platform. Whitelist anyone who still needs access "
                       "before turning it on.")

    h2("7.9  Evaluating exam attempts")
    para("For exams with written (subjective) answers, open Manage Exams, use Pending to "
         "list attempts awaiting marking, and open one to reach the Evaluate Attempt "
         "screen. Enter Marks for each subjective answer and click Submit Evaluation. "
         "Then use Send Results / Send Scores to email students.")
    screenshot(
        "Evaluate exam attempt",
        "Manage Exams \u2192 Pending \u2192 open an attempt.",
        "The Evaluate Attempt screen showing the student's answers with a Marks box per question and the Submit Evaluation button.")

    h2("7.10  Everything an Admin can do")
    para("As Super Admin you also have the full Admin toolset — Users, Courses, Support, "
         "Quizzes, Exams, Assessments and Certifications — covered in Part 6 and Part 4.")


# ===========================================================================
# PART 8 — PUBLIC PAGES
# ===========================================================================
def build_public():
    h1("Public & Information Pages", number="Part 8")
    lead("These pages are open to everyone — no login needed. They inform prospective "
         "students, host the legal documents, take support requests, and let anyone check "
         "a certificate.")

    h2("8.1  CA Knowledge Hub")
    para("From the Home page, the CA Knowledge Hub cards open three information pages via "
         "their Explore buttons:")
    bullets([
        ("CA Profession", "explains what the CA profession involves."),
        ("CA Curriculum", "explains the study curriculum."),
        ("Career Roadmap", "explains the CA career path."),
    ])
    para("Each page has a Join a Batch button (goes to Register) and an Explore "
         "Curriculum button, plus tabs with more detail.")
    screenshot(
        "A CA Knowledge Hub page",
        "Home page \u2192 Explore on any CA card (or /ca-profession, /ca-curriculum, /ca-roadmap).",
        "One of the CA information pages with its hero, highlight cards and the Join a Batch button.")

    h2("8.2  Legal pages")
    para("The footer links to four legal documents, each with an effective date and "
         "structured sections:")
    bullets([
        ("Privacy Policy", "how data is handled."),
        ("Terms of Service", "the rules of using the platform."),
        ("Cookie Policy", "how cookies are used."),
        ("Refund and Cancellation Policy", "refund terms."),
    ])
    para("Each legal page links to the Grievance and Support page and shows the company's "
         "legal details.")

    h2("8.3  Grievance & Support (public tickets)")
    para("Anyone can raise a support request here without logging in, and track it later. "
         "There are two tabs: New request and Track request.")
    h3("New request")
    button_table([
        ("Full name / Registered email / Phone (optional)", "Your contact details."),
        ("Category", "Account or access, Course or class, Payment or refund, Privacy request, Technical problem, or Other."),
        ("Subject", "A short title (5\u2013160 characters)."),
        ("Details", "The full message (20\u20135000 characters)."),
        ("Consent checkbox", "Required — permission to contact you."),
        ("Submit request", "Sends the ticket and gives you a reference number."),
    ])
    h3("Track request")
    button_table([
        ("Reference number", "The JECA-\u2026 code you were given."),
        ("Email used for the request", "The email you submitted with."),
        ("Check status", "Looks up the ticket and shows its progress."),
    ])
    h3("Step by step: raise a support request")
    steps([
        ("Open the", "Grievance and Support page (footer, or /grievance)."),
        ("On the", "New request tab, fill in your details."),
        ("Pick a", "Category, and write a Subject and Details."),
        ("Tick the consent box and click", "Submit request."),
        ("Save the", "reference number (JECA-\u2026) to track it later."),
    ])
    screenshot(
        "Grievance and Support form",
        "Footer \u2192 Grievance / Support (or /grievance).",
        "The New request form with the category dropdown, subject and details fields, consent checkbox and Submit request button.")

    h2("8.4  Verify a Certificate")
    para("Anyone can confirm a certificate is genuine. Open the Verify Certificate page "
         "(usually via a QR code or link on the certificate) and it checks the certificate "
         "ID automatically.")
    para("It shows Valid certificate or Certificate not valid, plus the Learner, Course, "
         "Issued date, Learner ID and Certificate ID. A Return to Just Easy CA Classes "
         "link takes you home.")
    screenshot(
        "Verify Certificate result",
        "Open a certificate's verification link, e.g. /verify/<certificateId>.",
        "The verification result showing Valid certificate with the learner, course, issue date and certificate ID.")

    h2("8.5  System pages you might meet")
    bullets([
        ("Maintenance page:", "shown when the platform is being updated, with a countdown timer."),
        ("Access denied (Unauthorized):", "shown if you open a page your role cannot access — use Return to Login."),
        ("Page not found (404):", "shown for an unknown web address — use Go back or Back to Home."),
    ])


# ===========================================================================
# PART 9 — APPENDICES
# ===========================================================================
def build_appendices():
    h1("Appendices", number="Part 9")

    h2("Appendix A — Glossary")
    button_table([
        ("Assessment", "An assignment submitted as a file or text and graded by a person."),
        ("Assistant", "A staff role focused on grading and helper tasks."),
        ("Cohort", "A group of students, e.g. by department or year."),
        ("Course", "A subject package of lectures, quizzes, assessments and exams."),
        ("Draft", "Content created but not yet visible to students."),
        ("Enrolment", "The link that lets a student study a course."),
        ("Exam", "A formal, often camera-monitored test with pass/fail marks."),
        ("Live Lecture", "A scheduled real-time video class."),
        ("Proctoring", "Camera/mic monitoring during an exam to prevent cheating."),
        ("Published", "Content made visible to students."),
        ("Quiz", "A short, usually timed, instantly-scored test."),
        ("Subjective question", "A written-answer question a person must mark."),
        ("Whitelist", "Users allowed in during maintenance mode."),
    ], col1="Term", col2="Meaning")

    h2("Appendix B — Status badges you will see")
    button_table([
        ("upcoming / scheduled", "A live class set for later (blue)."),
        ("ongoing / Live now", "A live class happening now (green)."),
        ("ended", "A finished live class (grey)."),
        ("DRAFT", "Unpublished quiz/exam (amber)."),
        ("PUBLISHED", "Live, student-visible quiz/exam (green)."),
        ("NOT SUBMITTED", "You have not sent your assessment yet (grey)."),
        ("SUBMITTED", "Sent, awaiting grading (amber/yellow)."),
        ("GRADED", "Marked, feedback available (green)."),
        ("Passed / Failed", "Exam result (green / red)."),
        ("Pending", "Exam still being evaluated (yellow)."),
        ("Past Due", "The due date has passed (red)."),
        ("Active / Expired", "Login session state (green / grey)."),
    ], col1="Badge", col2="What it means")

    h2("Appendix C — Troubleshooting & FAQ")
    h3("I can't log in")
    bullets([
        "Check your email and password are correct and Caps Lock is off.",
        "If you just registered, verify your email first (2.3).",
        "Use Forgot password? to reset (2.5).",
        "If you see the Change password screen, set a new password to continue (2.6).",
    ])
    h3("I registered but can't get in")
    bullets([
        "Open your inbox and click the verification link. Check spam.",
        "On the registration success screen you can use Resend verification email.",
    ])
    h3("The exam won't let me start / keeps warning me")
    bullets([
        "Allow camera and microphone access; use Retry Camera if needed.",
        "Stay in full-screen and don't switch tabs — each switch is a violation (3 = auto-submit).",
    ])
    h3("My exams are Locked")
    bullets([
        "Finish every lecture to 95%+, complete all quizzes, and submit all assessments; exams then unlock (3.4).",
    ])
    h3("I can't see any courses / live classes")
    bullets([
        "You may not be enrolled or assigned yet — contact your Admin.",
        "Teachers: live classes are scheduled by an Admin/Super Admin and then appear under Live Lectures.",
    ])
    h3("The whole site says it is under maintenance")
    bullets([
        "The platform is being updated. Wait for the countdown, or ask a Super Admin to whitelist you (7.8).",
    ])
    h3("Access denied when opening a page")
    bullets([
        "That page is for a different role. Use your own sidebar menu, or contact your Admin.",
    ])

    h2("Appendix D — Screenshot index & capture checklist")
    para("Every screenshot referenced in this book is listed below in order. Many are "
         "already embedded as real captures from the live platform (marked Embedded). "
         "The remaining ones (marked To capture) are screens that need seeded content or "
         "a live action — capture those and paste each into its matching dashed box.")
    embedded_count = sum(1 for s in SHOTS if s[4])
    para(f"Embedded so far: {embedded_count} of {len(SHOTS)}.", bold=True, color=NAVY)
    tbl = doc.add_table(rows=1, cols=4)
    tbl.style = "Table Grid"
    for c, t in zip(tbl.rows[0].cells, ("#", "Screenshot", "Where to go", "Status")):
        shade_cell(c, HEADER_BG_HEX)
        set_cell_margins(c)
        c.text = ""
        pp = c.paragraphs[0]
        no_space(pp)
        run(pp, t, bold=True, color=WHITE, size=10)
    tbl.columns[0].width = Inches(0.4)
    tbl.columns[1].width = Inches(3.0)
    tbl.columns[2].width = Inches(2.6)
    tbl.columns[3].width = Inches(0.9)
    for (n, title, where, _cap, embedded) in SHOTS:
        cells = tbl.add_row().cells
        if n % 2 == 1:
            for c in cells:
                shade_cell(c, ZEBRA_HEX)
        for c in cells:
            set_cell_margins(c)
        cells[0].text = ""
        no_space(cells[0].paragraphs[0])
        run(cells[0].paragraphs[0], f"{n:02d}", bold=True, color=ORANGE, size=9.5)
        cells[1].text = ""
        no_space(cells[1].paragraphs[0])
        run(cells[1].paragraphs[0], title, color=NAVY, bold=True, size=9.5)
        cells[2].text = ""
        no_space(cells[2].paragraphs[0])
        run(cells[2].paragraphs[0], where, size=9.5)
        cells[3].text = ""
        no_space(cells[3].paragraphs[0])
        run(cells[3].paragraphs[0], "Embedded" if embedded else "To capture",
            bold=True, size=9, color=(RGBColor(0x05, 0x96, 0x69) if embedded else GREY))
    doc.add_paragraph()

    # Closing
    hrule()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, "End of Guide Book", bold=True, color=NAVY, size=13)
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p2, "Just Easy CA Classes — Simplifying Commerce Education", italic=True, color=GREY, size=10.5)


# ===========================================================================
# BUILD
# ===========================================================================
def main():
    build_cover()
    build_user_types()
    build_credentials()
    build_toc()
    build_overview()
    build_getting_started()
    build_student()
    build_teacher()
    build_assistant()
    build_admin()
    build_superadmin()
    build_public()
    build_appendices()
    footer_page_numbers()

    out_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(out_dir, "JUSTEASY.IN GUIDE BOOK.docx")
    doc.save(out_path)
    print(f"Saved: {out_path}")
    print(f"Total screenshot placeholders: {len(SHOTS)}")


if __name__ == "__main__":
    main()
