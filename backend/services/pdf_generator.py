"""Clean PDF generation using reportlab — no system dependencies required."""

import re
import logging
from pathlib import Path
from datetime import datetime, timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    ListFlowable,
    ListItem,
)

from core.config import settings

logger = logging.getLogger(__name__)

# ── Colour palette ─────────────────────────────────────────────────────────────
_DARK    = colors.HexColor("#1a1a2e")
_HEADING = colors.HexColor("#302b63")
_ACCENT  = colors.HexColor("#6c5ce7")
_BODY    = colors.HexColor("#2d2d44")
_META    = colors.HexColor("#888888")
_RULE    = colors.HexColor("#d0d0e0")

# ── Styles ──────────────────────────────────────────────────────────────────────

def _styles() -> dict:
    return {
        "title": ParagraphStyle(
            "Title",
            fontName="Helvetica-Bold",
            fontSize=26,
            leading=32,
            spaceAfter=4 * mm,
            textColor=_DARK,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            fontName="Helvetica-Oblique",
            fontSize=10,
            leading=15,
            spaceAfter=3 * mm,
            textColor=colors.HexColor("#555577"),
        ),
        "meta": ParagraphStyle(
            "Meta",
            fontName="Helvetica",
            fontSize=8.5,
            leading=13,
            spaceAfter=5 * mm,
            textColor=_META,
        ),
        "section": ParagraphStyle(
            "Section",
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            spaceBefore=9 * mm,
            spaceAfter=3 * mm,
            textColor=_HEADING,
        ),
        "subheading": ParagraphStyle(
            "SubHeading",
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=15,
            spaceBefore=4 * mm,
            spaceAfter=2 * mm,
            textColor=_HEADING,
        ),
        "body": ParagraphStyle(
            "Body",
            fontName="Helvetica",
            fontSize=10,
            leading=16,
            spaceAfter=4 * mm,
            textColor=_BODY,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            spaceAfter=1.5 * mm,
            textColor=_BODY,
        ),
    }


# ── Helpers ─────────────────────────────────────────────────────────────────────

def _clean(text: str) -> str:
    """Strip markdown bold/italic markers."""
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*",     r"\1", text)
    # Replace em-dash with plain double-dash for Helvetica (Latin-1)
    text = text.replace("—", "--").replace("–", "-")
    return text


def _flush_bullets(buffer: list[str], s: dict) -> ListFlowable | None:
    if not buffer:
        return None
    items = [
        ListItem(
            Paragraph(_clean(b), s["bullet"]),
            bulletColor=_ACCENT,
        )
        for b in buffer
    ]
    return ListFlowable(items, bulletType="bullet", leftIndent=12, bulletFontSize=8)


def _section_elements(body: str, s: dict) -> list:
    """Convert a section body (markdown-ish) into reportlab flowables."""
    elements = []
    bullets: list[str] = []

    for line in body.splitlines():
        stripped = line.strip()

        if not stripped:
            flushed = _flush_bullets(bullets, s)
            if flushed:
                elements.append(flushed)
                bullets = []
            continue

        if stripped.startswith("### "):
            flushed = _flush_bullets(bullets, s)
            if flushed:
                elements.append(flushed)
                bullets = []
            elements.append(Paragraph(_clean(stripped[4:]), s["subheading"]))

        elif stripped.startswith(("- ", "* ", "• ")):
            bullets.append(stripped[2:])

        else:
            flushed = _flush_bullets(bullets, s)
            if flushed:
                elements.append(flushed)
                bullets = []
            elements.append(Paragraph(_clean(stripped), s["body"]))

    flushed = _flush_bullets(bullets, s)
    if flushed:
        elements.append(flushed)

    return elements


# ── Public API ──────────────────────────────────────────────────────────────────

async def generate_pdf(
    session_id: int,
    company_name: str,
    research_objective: str,
    sections: list[tuple[str, str]],
    quality_score: float | None = None,
) -> str:
    """Build a clean PDF report and return its path on disk."""
    output_dir = Path(settings.storage_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"report_{session_id}.pdf"

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm,
        title=f"{company_name} — Scout AI Research Report",
        author="Scout AI",
    )

    s = _styles()
    elements: list = []
    generated_at = datetime.now(timezone.utc).strftime("%B %d, %Y")
    quality_pct = int((quality_score or 0) * 100)

    # ── Cover ────────────────────────────────────────────────────────────────
    elements.append(Spacer(1, 6 * mm))
    elements.append(Paragraph(_clean(company_name), s["title"]))

    if research_objective and research_objective.strip() != company_name.strip():
        elements.append(Paragraph(_clean(research_objective), s["subtitle"]))

    elements.append(Paragraph(
        f"Scout AI Research Report  ·  {generated_at}  ·  Quality Score: {quality_pct}%",
        s["meta"],
    ))
    elements.append(HRFlowable(
        width="100%", thickness=0.6, color=_RULE, spaceAfter=6 * mm,
    ))

    # ── Sections ─────────────────────────────────────────────────────────────
    for title, body in sections:
        elements.append(Paragraph(title, s["section"]))
        elements.extend(_section_elements(body, s))

    # ── Footer rule ───────────────────────────────────────────────────────────
    elements.append(Spacer(1, 8 * mm))
    elements.append(HRFlowable(
        width="100%", thickness=0.4, color=_RULE, spaceAfter=3 * mm,
    ))
    elements.append(Paragraph(
        f"Scout AI — Confidential Research Report — Generated {generated_at}",
        s["meta"],
    ))

    doc.build(elements)
    logger.info("PDF report written to %s", output_path)
    return str(output_path)
