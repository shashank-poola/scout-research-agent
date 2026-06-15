from langchain_groq import ChatGroq
from core.config import settings


def get_llm(model: str = "llama-3.3-70b-versatile", temperature: float = 0.2) -> ChatGroq:
    return ChatGroq(
        model=model,
        temperature=temperature,
        api_key=settings.groq_api_key,
    )
