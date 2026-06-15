from services.pdf_generator import generate_pdf
from graph.state import ResearchState


async def report_generator_node(state: ResearchState) -> dict:
    html = _build_html(state)
    path = await generate_pdf(html, session_id=state["session_id"])
    return {"report_html": html, "report_path": path}


def _build_html(state: ResearchState) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Scout AI Report — {state['company_name']}</title>
<style>
  body {{ font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; }}
  h1 {{ color: #0a2540; border-bottom: 2px solid #0a2540; padding-bottom: 8px; }}
  h2 {{ color: #1a5276; margin-top: 32px; }}
  .meta {{ color: #555; font-size: 0.9em; margin-bottom: 24px; }}
  pre {{ white-space: pre-wrap; font-family: inherit; }}
</style>
</head>
<body>
  <h1>Scout AI Research Report</h1>
  <div class="meta">
    <strong>Company:</strong> {state['company_name']}<br>
    <strong>Website:</strong> {state['website']}<br>
    <strong>Objective:</strong> {state['research_objective']}
  </div>
  <h2>Analysis</h2>
  <pre>{state.get('analysis', '')}</pre>
</body>
</html>"""
