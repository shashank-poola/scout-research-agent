from langgraph.graph import StateGraph, END
from graph.state import ResearchState
from graph.edges import route_after_quality_check
from graph.nodes.planner import planner_node
from graph.nodes.researcher import researcher_node
from graph.nodes.analyzer import analyzer_node
from graph.nodes.quality_check import quality_check_node
from graph.nodes.report_generator import report_generator_node


def build_workflow() -> StateGraph:
    builder = StateGraph(ResearchState)

    builder.add_node("planner", planner_node)
    builder.add_node("researcher", researcher_node)
    builder.add_node("analyzer", analyzer_node)
    builder.add_node("quality_check", quality_check_node)
    builder.add_node("generate_report", report_generator_node)

    builder.set_entry_point("planner")
    builder.add_edge("planner", "researcher")
    builder.add_edge("researcher", "analyzer")
    builder.add_edge("analyzer", "quality_check")
    builder.add_conditional_edges(
        "quality_check",
        route_after_quality_check,
        {
            "generate_report": "generate_report",
            "researcher": "researcher",
            "error": END,
        },
    )
    builder.add_edge("generate_report", END)

    return builder.compile()


workflow = build_workflow()
