"""PDF generation via WeasyPrint, run in a thread pool to avoid blocking the event loop."""

import asyncio
from pathlib import Path
from core.config import settings


async def generate_pdf(html: str, session_id: int) -> str:
    output_dir = Path(settings.storage_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"report_{session_id}.pdf"

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _write_pdf, html, str(output_path))
    return str(output_path)


def _write_pdf(html: str, path: str) -> None:
    from weasyprint import HTML
    HTML(string=html).write_pdf(path)
