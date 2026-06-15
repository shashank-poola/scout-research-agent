import asyncio
from pathlib import Path
from core.config import settings


async def generate_pdf(html: str, session_id: int) -> str:
    output_dir = Path(settings.storage_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"report_{session_id}.pdf"

    # WeasyPrint is sync — run in thread pool to avoid blocking event loop
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _write_pdf, html, str(output_path))
    return str(output_path)


def _write_pdf(html: str, path: str) -> None:
    from weasyprint import HTML
    HTML(string=html).write_pdf(path)
