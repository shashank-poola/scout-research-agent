"""Report generator node — converts the structured analysis into a styled PDF report."""

import re
import logging
from datetime import datetime, timezone
from services.pdf_generator import generate_pdf
from graph.state import ResearchState

logger = logging.getLogger(__name__)

_SECTION_ORDER = [
    "Executive Summary",
    "Company Overview",
    "Products & Services",
    "Market Position",
    "Competitive Landscape",
    "Recent Developments",
    "Financial Signals",
    "Risks & Opportunities",
]


def _parse_sections(analysis: str) -> list[tuple[str, str]]:
    """Split markdown analysis into (title, body) pairs by ## headers."""
    pattern = re.compile(r"^##\s+(.+)$", re.MULTILINE)
    matches = list(pattern.finditer(analysis))
    sections = []
    for i, match in enumerate(matches):
        title = match.group(1).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(analysis)
        body = analysis[start:end].strip()
        sections.append((title, body))
    return sections


def _inline_md(text: str) -> str:
    """Render inline **bold** and *italic* markdown to HTML."""
    text = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.*?)\*", r"<em>\1</em>", text)
    return text


def _paragraphs_to_html(text: str) -> str:
    """Convert markdown text to HTML — handles sub-headings, bullets, bold."""
    lines = text.splitlines()
    html_parts = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("### "):
            html_parts.append(f"<h3>{_inline_md(stripped[4:])}</h3>")
        elif stripped.startswith(("- ", "* ", "• ")):
            html_parts.append(f"<li>{_inline_md(stripped[2:])}</li>")
        else:
            html_parts.append(f"<p>{_inline_md(stripped)}</p>")

    result = "\n".join(html_parts)
    result = re.sub(r"((?:<li>.*?</li>\n?)+)", r"<ul>\1</ul>", result, flags=re.DOTALL)
    return result


def _extract_company_name(query: str) -> str:
    """Pull the short company name out of a potentially long research query."""
    for sep in ["—", " - ", ": "]:
        if sep in query:
            part = query.split(sep)[0].strip()
            part = re.sub(r"^[Rr]esearch\s+(on\s+)?", "", part).strip()
            return part[:60]
    clean = re.sub(r"^[Rr]esearch\s+(on\s+)?", "", query).strip()
    return clean[:50]


def _get_ordered_sections(state: ResearchState) -> list[tuple[str, str]]:
    """Return analysis sections in canonical order."""
    raw = _parse_sections(state.get("analysis", ""))
    lookup = {title: body for title, body in raw}
    ordered = []
    for title in _SECTION_ORDER:
        ordered.append((title, lookup.pop(title, "Insufficient public data available.")))
    ordered.extend(lookup.items())
    return ordered


def _build_html(state: ResearchState) -> str:
    ordered = _get_ordered_sections(state)
    section_html = ""
    for title, body in ordered:
        section_html += f"""
        <section>
          <h2>{title}</h2>
          <div class="section-body">{_paragraphs_to_html(body)}</div>
        </section>"""

    company_display = _extract_company_name(state["company_name"])
    quality_pct = int((state.get("quality_score") or 0) * 100)
    generated_at = datetime.now(timezone.utc).strftime("%B %d, %Y")

    quality_color = '#16a34a' if quality_pct >= 70 else '#d97706'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Scout AI — {company_display} Research Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 10.5pt;
      line-height: 1.75;
      color: #1a1a2e;
      background: #ffffff;
    }}

    /* Cover */
    .cover {{
      min-height: 220px;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      color: #fff;
      padding: 44px 56px 36px;
    }}
    .cover-label {{
      font-size: 8.5pt;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      opacity: 0.55;
      margin-bottom: 14px;
    }}
    .cover h1 {{
      font-size: 26pt;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
      line-height: 1.15;
    }}
    .cover-sub {{
      font-size: 10.5pt;
      opacity: 0.65;
      margin-bottom: 26px;
      max-width: 560px;
    }}
    .cover-meta {{
      display: flex;
      gap: 32px;
      border-top: 1px solid rgba(255,255,255,0.18);
      padding-top: 18px;
      font-size: 8.5pt;
      opacity: 0.65;
    }}
    .cover-meta strong {{ display: block; opacity: 1; font-weight: 600; margin-bottom: 2px; }}

    /* Quality bar */
    .quality-bar {{
      background: #f4f6fa;
      border-bottom: 1px solid #e8ecf4;
      padding: 10px 56px;
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 8.5pt;
      color: #555;
    }}
    .quality-score {{
      font-weight: 700;
      font-size: 10.5pt;
      color: {quality_color};
    }}
    .quality-label {{ opacity: 0.7; }}

    /* Body */
    .body {{ padding: 36px 56px 56px; }}

    /* Sections */
    section {{
      margin-bottom: 32px;
      page-break-inside: avoid;
    }}
    h2 {{
      font-size: 12.5pt;
      font-weight: 700;
      color: #302b63;
      border-left: 4px solid #6c5ce7;
      padding-left: 12px;
      margin-bottom: 14px;
      page-break-after: avoid;
    }}
    h3 {{
      font-size: 10.5pt;
      font-weight: 600;
      color: #302b63;
      margin: 14px 0 6px;
    }}
    .section-body p {{
      margin-bottom: 9px;
      color: #2d2d44;
    }}
    .section-body ul {{
      margin: 6px 0 10px 20px;
    }}
    .section-body li {{
      margin-bottom: 5px;
      color: #2d2d44;
    }}
    strong {{ color: #1a1a2e; }}

    /* Footer */
    .footer {{
      border-top: 1px solid #e8ecf4;
      padding: 14px 56px;
      font-size: 8pt;
      color: #aaa;
      display: flex;
      justify-content: space-between;
    }}
  </style>
</head>
<body>

  <div class="cover">
    <div class="cover-label">Scout AI · Research Report</div>
    <h1>{company_display}</h1>
    <div class="cover-sub">{state['research_objective']}</div>
    <div class="cover-meta">
      <div><strong>Generated</strong>{generated_at}</div>
      <div><strong>Website</strong>{state['website'] or '—'}</div>
      <div><strong>Quality Score</strong>{quality_pct}%</div>
    </div>
  </div>

  <div class="quality-bar">
    <span class="quality-score">{quality_pct}%</span>
    <span class="quality-label">Research quality score · {state.get('quality_feedback', '')}</span>
  </div>

  <div class="body">
    {section_html}
  </div>

  <div class="footer">
    <span>Scout AI — Confidential Research Report</span>
    <span>Generated {generated_at}</span>
  </div>

</body>
</html>"""


async def report_generator_node(state: ResearchState) -> dict:
    ordered_sections = _get_ordered_sections(state)
    company_display = _extract_company_name(state["company_name"])
    html = _build_html(state)   # kept for chat Q&A context in state
    path = await generate_pdf(
        session_id=state["session_id"],
        company_name=company_display,
        research_objective=state.get("research_objective", ""),
        sections=ordered_sections,
        quality_score=state.get("quality_score"),
    )
    logger.info("PDF report saved to %s", path)
    return {"report_html": html, "report_path": path}
