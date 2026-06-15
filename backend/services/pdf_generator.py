"""Report file writer — saves the HTML report to disk.

WeasyPrint (HTML→PDF) requires GTK native libs unavailable on Windows without
a manual installer. Serving the styled HTML directly is equivalent for the
frontend iframe and avoids all native dependency issues.
"""

from pathlib import Path
from core.config import settings


async def generate_pdf(html: str, session_id: int) -> str:
    """Write the report HTML to disk and return the file path."""
    output_dir = Path(settings.storage_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"report_{session_id}.html"
    output_path.write_text(html, encoding="utf-8")
    return str(output_path)
