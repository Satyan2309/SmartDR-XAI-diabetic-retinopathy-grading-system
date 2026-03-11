# backend/report_gen.py
from pathlib import Path
from datetime import datetime
from fpdf import FPDF


GRADE_NAMES = {
    0: "No DR",
    1: "Mild DR",
    2: "Moderate DR",
    3: "Severe DR",
    4: "Proliferative DR"
}
URGENCY_COLOR = {
    "LOW":      (22,  163, 74),
    "MEDIUM":   (217, 119, 6),
    "HIGH":     (234, 88,  12),
    "CRITICAL": (220, 38,  38),
}
GRADE_COLOR = {
    0: (22,  163, 74),
    1: (37,  99,  235),
    2: (217, 119, 6),
    3: (234, 88,  12),
    4: (220, 38,  38),
}


def safe(text):
    """Convert any string to latin-1 safe — replaces unsupported chars with '?'"""
    return str(text).encode("latin-1", errors="replace").decode("latin-1")


class PDF(FPDF):
    def header(self):
        self.set_fill_color(26, 39, 68)
        self.rect(0, 0, 210, 22, "F")
        self.set_y(5)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(255, 255, 255)
        self.cell(0, 8, safe("SmartDR-XAI  |  Diabetic Retinopathy Report"),
                  align="L", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 5,
                  safe("EfficientNet-B2  |  Grad-CAM++ Explainability  |  QWK 0.9079  |  Acc 84.58%"),
                  new_x="LMARGIN", new_y="NEXT")
        self.ln(6)

    def footer(self):
        self.set_y(-14)
        self.set_draw_color(226, 232, 240)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(2)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(148, 163, 184)
        ts = datetime.now().strftime("%d %b %Y %H:%M")
        self.cell(
            0, 5,
            safe(f"Page {self.page_no()}  |  Generated {ts}  |  Lloyd Institute of Engineering & Technology, CSE-DS"),
            align="C"
        )


def _section_title(pdf, title):
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(100, 116, 139)
    pdf.set_fill_color(248, 250, 252)
    pdf.cell(0, 7, safe(f"  {title.upper()}"),
             fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)


def _kv(pdf, label, value, label_w=52):
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(label_w, 6, safe(label))
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 6, safe(value), new_x="LMARGIN", new_y="NEXT")


def generate_pdf_report(record: dict, doctor: dict) -> str:
    pdf = PDF()
    pdf.set_margins(12, 26, 12)
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=18)

    grade   = record.get("grade", 0)
    urgency = record.get("urgency", "LOW")
    r, g, b = GRADE_COLOR.get(grade, (37, 99, 235))
    ur, ug, ub = URGENCY_COLOR.get(urgency, (22, 163, 74))

    # ── Grade badge row ───────────────────────────────────────
    pdf.set_fill_color(r, g, b)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(55, 18, safe(f"  Grade {grade}"),
             fill=True, new_x="RIGHT", new_y="TOP")

    pdf.set_fill_color(248, 250, 252)
    pdf.set_text_color(15, 23, 42)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(90, 18, safe(f"  {GRADE_NAMES.get(grade, '')}"),
             fill=True, new_x="RIGHT", new_y="TOP")

    pdf.set_fill_color(ur, ug, ub)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(43, 18, safe(f"  {urgency}"),
             fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # ── Patient + Doctor side by side ─────────────────────────
    col_w   = 93
    y_start = pdf.get_y()

    _section_title(pdf, "Patient Information")
    _kv(pdf, "Name",   str(record.get("patient_name", "-")))
    _kv(pdf, "ID",     str(record.get("patient_id",   "-")))
    _kv(pdf, "Age",    str(record.get("patient_age",  "-")))
    _kv(pdf, "Gender", str(record.get("patient_gender", "-")))
    _kv(pdf, "Date",   f"{record.get('date','')} {record.get('time','')}")
    p_end_y = pdf.get_y()

    pdf.set_xy(col_w + 12, y_start)
    _section_title(pdf, "Referring Doctor")
    for label, val in [
        ("Name",     doctor.get("name",           "-")),
        ("ID",       doctor.get("doctor_id",      "-")),
        ("Hospital", doctor.get("hospital",       "-")),
        ("Spec.",    doctor.get("specialization", "-")),
        ("City",     doctor.get("city",           "-")),
    ]:
        pdf.set_x(col_w + 12)
        _kv(pdf, label, str(val))

    pdf.set_y(max(p_end_y, pdf.get_y()) + 4)

    # ── AI Diagnosis ──────────────────────────────────────────
    _section_title(pdf, "AI Diagnosis")
    _kv(pdf, "Confidence", f"{record.get('confidence', 0)}%")
    _kv(pdf, "Record ID",  str(record.get("record_id", "-")))
    _kv(pdf, "Model",      "EfficientNet-B2  (QWK: 0.9079, Acc: 84.58%)")
    pdf.ln(3)

    # ── Probability bars ──────────────────────────────────────
    _section_title(pdf, "Grade Probabilities")
    bar_colors = [
        (22, 163, 74), (37, 99, 235), (217, 119, 6),
        (234, 88, 12), (220, 38, 38)
    ]
    bar_names = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]
    probs = [
        float(record.get("prob_grade_0", 0)),
        float(record.get("prob_grade_1", 0)),
        float(record.get("prob_grade_2", 0)),
        float(record.get("prob_grade_3", 0)),
        float(record.get("prob_grade_4", 0)),
    ]

    for i, pct in enumerate(probs):
        # Normalize: stored as decimal (0.72) → multiply by 100, stored as percent (72.0) → use directly
        pct_val = pct if pct > 1.0 else pct * 100
        pct_val = min(pct_val, 100.0)  # safety cap
        cr, cg, cb = bar_colors[i]
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(26, 5, safe(f"G{i} {bar_names[i]}"))

        bar_x = pdf.get_x()
        bar_y = pdf.get_y()

        # background track
        pdf.set_fill_color(226, 232, 240)
        pdf.cell(120, 4, "", fill=True, new_x="RIGHT", new_y="TOP")

        # filled portion
        fill_w = max(0.5, 120 * pct_val / 100)
        pdf.set_fill_color(cr, cg, cb)
        pdf.set_xy(bar_x, bar_y)
        pdf.cell(fill_w, 4, "", fill=True, new_x="RIGHT", new_y="TOP")

        # percentage label
        pdf.set_xy(bar_x + 122, bar_y)
        pdf.set_text_color(15, 23, 42)
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(20, 4, safe(f"{pct_val:.1f}%"),
                 new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)

    pdf.ln(4)

    # ── Eye Images ────────────────────────────────────────────
    record_id = record.get("record_id", "")
    img_dir   = Path(f"reports/images/{record_id}")
    img_map   = [
        ("Original Fundus",    img_dir / "original.png"),
        ("CLAHE Enhanced",     img_dir / "enhanced.png"),
        ("Grad-CAM++ Heatmap", img_dir / "heatmap.png"),
    ]
    available = [(lbl, p) for lbl, p in img_map if p.exists()]

    if available:
        _section_title(pdf, "Retinal Images & Grad-CAM++ Explainability")

        img_w   = 56
        img_h   = 56
        gap     = 5
        y_img   = pdf.get_y()

        if y_img + img_h + 20 > 275:
            pdf.add_page()
            y_img = pdf.get_y()

        x = 12
        for lbl, path in available:
            try:
                pdf.image(str(path), x=x, y=y_img, w=img_w, h=img_h)
                pdf.set_xy(x, y_img + img_h + 1)
                pdf.set_font("Helvetica", "B", 7.5)
                pdf.set_text_color(51, 65, 85)
                pdf.cell(img_w, 5, safe(lbl), align="C")
            except Exception:
                pass
            x += img_w + gap

        pdf.set_y(y_img + img_h + 10)
        pdf.ln(2)

        # Explanation box
        pdf.set_fill_color(254, 242, 242)
        pdf.set_draw_color(252, 165, 165)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(153, 27, 27)
        pdf.multi_cell(
            0, 5,
            safe(
                "  Grad-CAM++ Interpretation: Red/yellow zones highlight regions the AI"
                " focused on for classification - typically microaneurysms, hemorrhages,"
                " hard exudates, or neovascularization in higher grade cases."
                " Blue/cool zones indicate low attention areas."
            ),
            border=1, fill=True
        )
        pdf.ln(4)

    # ── Clinical Notes ────────────────────────────────────────
    notes = str(record.get("notes", "")).strip()
    if notes:
        _section_title(pdf, "Clinical Notes")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(51, 65, 85)
        pdf.multi_cell(0, 5, safe(f"  {notes}"))
        pdf.ln(3)

    # ── Disclaimer ────────────────────────────────────────────
    pdf.set_fill_color(239, 246, 255)
    pdf.set_draw_color(191, 219, 254)
    pdf.set_font("Helvetica", "I", 7.5)
    pdf.set_text_color(29, 78, 216)
    pdf.multi_cell(
        0, 4.5,
        safe(
            "  DISCLAIMER: This report is generated by an AI system for clinical decision"
            " support only. It must be reviewed and validated by a qualified ophthalmologist"
            " before any clinical action is taken."
            " This report does not replace professional medical diagnosis."
        ),
        border=1, fill=True
    )

    # ── Save ──────────────────────────────────────────────────
    out_dir  = Path("reports")
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / f"SmartDR_{record_id}.pdf"
    pdf.output(str(out_path))
    return str(out_path)