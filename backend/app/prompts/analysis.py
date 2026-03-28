from __future__ import annotations

import json

from app.domain.models import AnalysisSession


def build_clarification_prompts(session: AnalysisSession) -> tuple[str, str]:
    system_prompt = (
        "You are the LLM Analysis MCP for a structured decision-analysis assistant. "
        "Your job is to generate only high-value clarification questions before deeper analysis begins. "
        "Questions must be concrete, non-redundant, and suitable for a frontend form. Return strict JSON only."
    )
    user_prompt = (
        "Return JSON with a top-level 'questions' array. Each item must contain "
        "question_text, purpose, options, allow_custom_input, allow_skip, and priority.\n"
        f"mode={session.mode.value}\n"
        f"problem_statement={session.problem_statement}"
    )
    return system_prompt, user_prompt


def build_planning_prompts(session: AnalysisSession) -> tuple[str, str]:
    answered_questions = []
    answer_map = {answer.question_id: answer.value for answer in session.answers}
    for question in session.clarification_questions:
        if question.question_id in answer_map:
            answered_questions.append(
                {
                    "question_text": question.question_text,
                    "answer": answer_map[question.question_id],
                    "purpose": question.purpose,
                }
            )

    evidence_items = [
        {
            "title": item.title,
            "source_name": item.source_name,
            "summary": item.summary,
            "facts": item.extracted_facts[:3],
            "confidence": item.confidence,
        }
        for item in session.evidence_items[-8:]
    ]
    conclusions = [
        {
            "content": item.content,
            "conclusion_type": item.conclusion_type,
            "basis_refs": item.basis_refs,
            "confidence": item.confidence,
        }
        for item in session.major_conclusions[-8:]
    ]
    system_prompt = (
        "You are the LLM Analysis MCP for a structured multi-round decision-analysis workflow. "
        "For each round, decide whether to ask follow-up questions, plan external search tasks, "
        "or stop information gathering and move to the final report. "
        "Never repeat answered questions. Avoid asking multiple variations of the same question. "
        "Ask only the minimum number of high-value questions needed to change the recommendation or evidence plan. "
        "If the evidence chain is already sufficient for a bounded recommendation, end the questioning and move to the final report. "
        "Prefer the minimum next step that materially reduces uncertainty. Separate facts from inference. Return strict JSON only."
    )
    user_prompt = (
        "Return JSON with keys: clarification_questions, search_tasks, major_conclusions, "
        "ready_for_report, reasoning_focus, stop_reason.\n"
        "clarification_questions items must contain question_text, purpose, options, "
        "allow_custom_input, allow_skip, and priority.\n"
        "search_tasks items must contain search_topic, search_goal, search_scope, "
        "suggested_queries, required_fields, and freshness_requirement.\n"
        "major_conclusions items must contain content, conclusion_type, basis_refs, and confidence.\n"
        "Rules:\n"
        "1. If critical user-specific constraints are still missing, prefer clarification_questions.\n"
        "2. Do not ask repeated, low-value, or cosmetically reworded questions.\n"
        "3. Keep clarification_questions as small as possible and only include questions that would materially change the recommendation, ranking, or evidence plan.\n"
        "4. If user facts are mostly sufficient but external facts need verification, return search_tasks.\n"
        "5. If the current information is enough for a bounded recommendation, set ready_for_report=true.\n"
        "6. stop_reason should explain why the loop should pause for user input, run MCP search, or end.\n"
        "7. reasoning_focus should summarize the single most important uncertainty or decision dimension for this round.\n"
        f"mode={session.mode.value}\n"
        f"problem_statement={session.problem_statement}\n"
        f"analysis_rounds_completed={session.analysis_rounds_completed}\n"
        f"follow_up_round_limit={session.follow_up_round_limit}\n"
        f"follow_up_rounds_used={session.follow_up_rounds_used}\n"
        "answered_questions_json="
        + json.dumps(answered_questions, ensure_ascii=False)
        + "\nexisting_evidence_json="
        + json.dumps(evidence_items, ensure_ascii=False)
        + "\nexisting_major_conclusions_json="
        + json.dumps(conclusions, ensure_ascii=False)
    )
    return system_prompt, user_prompt


def build_reporting_prompts(session: AnalysisSession) -> tuple[str, str]:
    evidence_items = [
        {
            "title": item.title,
            "source_name": item.source_name,
            "summary": item.summary,
            "facts": item.extracted_facts[:3],
        }
        for item in session.evidence_items[-10:]
    ]
    conclusions = [
        {
            "content": item.content,
            "conclusion_type": item.conclusion_type,
            "basis_refs": item.basis_refs,
            "confidence": item.confidence,
        }
        for item in session.major_conclusions
    ]
    system_prompt = (
        "You are the final-report writer inside the LLM Analysis MCP. "
        "You receive a clean context distilled from prior rounds instead of raw chat history. "
        "Write a concise but decision-useful report, clearly distinguishing assumptions, facts, inferences, "
        "recommendations, and remaining open questions. Return strict JSON only."
    )
    user_prompt = (
        "Return JSON with summary, assumptions, recommendations, open_questions, and markdown.\n"
        f"mode={session.mode.value}\n"
        f"problem_statement={session.problem_statement}\n"
        f"status={session.status.value}\n"
        f"analysis_rounds_completed={session.analysis_rounds_completed}\n"
        "major_conclusions_json="
        + json.dumps(conclusions, ensure_ascii=False)
        + "\nevidence_json="
        + json.dumps(evidence_items, ensure_ascii=False)
    )
    return system_prompt, user_prompt
