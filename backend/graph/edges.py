from graph.state import ResearchState


def route_after_quality_check(state: ResearchState) -> str:
    if state.get("error"):
        return "error"
    if state.get("quality_score", 0) >= 0.7:
        return "generate_report"
    return "researcher"  # loop back for more research
