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


def _paragraphs_to_html(text: str) -> str:
    """Convert plain text / simple markdown to HTML paragraphs."""
    lines = text.splitlines()
    html_parts = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # bullet points
        if stripped.startswith(("- ", "* ", "• ")):
            html_parts.append(f"<li>{stripped[2:]}</li>")
        else:
            html_parts.append(f"<p>{stripped}</p>")

    # wrap consecutive <li> in <ul>
    result = "\n".join(html_parts)
    result = re.sub(r"((?:<li>.*?</li>\n?)+)", r"<ul>\1</ul>", result, flags=re.DOTALL)
    return result


def _build_html(state: ResearchState) -> str:
    sections = _parse_sections(state.get("analysis", ""))
    # Sort by canonical order, append any extras
    ordered = {title: body for title, body in sections}
    section_html = ""
    for title in _SECTION_ORDER:
        body = ordered.pop(title, "Insufficient public data available.")
        section_html += f"""
        <section>
          <h2>{title}</h2>
          <div class="section-body">{_paragraphs_to_html(body)}</div>
        </section>"""
    # Any extra sections the LLM produced
    for title, body in ordered.items():
        section_html += f"""
        <section>
          <h2>{title}</h2>
          <div class="section-body">{_paragraphs_to_html(body)}</div>
        </section>"""

    quality_pct = int((state.get("quality_score") or 0) * 100)
    generated_at = datetime.now(timezone.utc).strftime("%B %d, %Y")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Scout AI — {state['company_name']} Research Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 10.5pt;
      line-height: 1.7;
      color: #1a1a2e;
      background: #ffffff;
    }}

    /* Cover */
    .cover {{
      min-height: 240px;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      color: #fff;
      padding: 48px 56px 40px;
      margin-bottom: 0;
    }}
    .cover-label {{
      font-size: 9pt;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      opacity: 0.6;
      margin-bottom: 16px;
    }}
    .cover h1 {{
      font-size: 28pt;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }}
    .cover-sub {{
      font-size: 11pt;
      opacity: 0.75;
      margin-bottom: 28px;
    }}
    .cover-meta {{
      display: flex;
      gap: 32px;
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 20px;
      font-size: 9pt;
      opacity: 0.7;
    }}
    .cover-meta strong {{ display: block; opacity: 1; font-weight: 600; margin-bottom: 2px; }}

    /* Quality badge */
    .quality-bar {{
      background: #f4f6fa;
      border-bottom: 1px solid #e8ecf4;
      padding: 12px 56px;
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 9pt;
      color: #555;
    }}
    .quality-score {{
      font-weight: 700;
      font-size: 11pt;
      color: {'#16a34a' if quality_pct >= 70 else '#d97706'};
    }}
    .quality-label {{ opacity: 0.7; }}

    /* Body */
    .body {{ padding: 40px 56px 56px; }}

    /* Sections */
    section {{
      margin-bottom: 36px;
      page-break-inside: avoid;
    }}
    h2 {{
      font-size: 13pt;
      font-weight: 700;
      color: #302b63;
      border-left: 4px solid #6c5ce7;
      padding-left: 12px;
      margin-bottom: 14px;
      page-break-after: avoid;
    }}
    .section-body p {{
      margin-bottom: 10px;
      color: #2d2d44;
    }}
    .section-body ul {{
      margin: 8px 0 10px 20px;
    }}
    .section-body li {{
      margin-bottom: 5px;
      color: #2d2d44;
    }}

    /* Footer */
    .footer {{
      border-top: 1px solid #e8ecf4;
      padding: 16px 56px;
      font-size: 8pt;
      color: #999;
      display: flex;
      justify-content: space-between;
    }}
  </style>
</head>
<body>

  <div class="cover">
    <div class="cover-label">Scout AI · Research Report</div>
    <h1>{state['company_name']}</h1>
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
    html = _build_html(state)
    path = await generate_pdf(html, session_id=state["session_id"])
    logger.info("Report PDF saved to %s", path)
    return {"report_html": html, "report_path": path}
