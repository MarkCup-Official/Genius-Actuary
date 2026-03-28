from app.domain.models import (
    AnalysisMode,
    AnalysisReport,
    AnalysisSession,
    ClarificationQuestion,
    MajorConclusionItem,
    SearchTask,
)


class MockAnalysisAdapter:
    def generate_initial_questions(self, session: AnalysisSession) -> list[ClarificationQuestion]:
        base_questions = [
            ClarificationQuestion(
                question_text="这次决策里，你最看重的目标是什么？",
                purpose="明确决策目标，避免分析偏离重点。",
                options=["省钱", "降低风险", "提升长期回报", "节省时间"],
                priority=1,
            ),
            ClarificationQuestion(
                question_text="你当前有哪些明确约束条件？",
                purpose="补齐预算、时间、地点、家庭或职业限制。",
                options=["预算有限", "时间有限", "不接受高风险", "需要尽快落地"],
                priority=1,
            ),
        ]
        if session.mode == AnalysisMode.MULTI_OPTION:
            base_questions.append(
                ClarificationQuestion(
                    question_text="请列出你当前正在比较的主要选项。",
                    purpose="明确候选项，方便后续做对比矩阵和图表。",
                    options=[],
                    priority=1,
                )
            )
        return base_questions

    def plan_next_round(
        self,
        session: AnalysisSession,
    ) -> tuple[list[SearchTask], list[MajorConclusionItem]]:
        search_tasks = [
            SearchTask(
                search_topic="外部事实补充",
                search_goal="验证与当前问题强相关的公开信息、成本或政策事实。",
                search_scope="优先最近 12 个月、与问题所在地区直接相关的信息。",
                suggested_queries=[
                    session.problem_statement,
                    f"{session.problem_statement} cost",
                    f"{session.problem_statement} policy",
                ],
                required_fields=["title", "source", "date", "key facts"],
                freshness_requirement="high",
            )
        ]

        conclusions = [
            MajorConclusionItem(
                content="当前已进入结构化分析阶段，后续应以用户目标、约束与外部事实三者交叉验证。",
                conclusion_type="inference",
                confidence=0.72,
            )
        ]
        return search_tasks, conclusions

    def build_report(self, session: AnalysisSession) -> AnalysisReport:
        assumptions = []
        if not session.answers:
            assumptions.append("用户尚未补充完整约束，当前报告偏保守。")
        if not session.evidence_items:
            assumptions.append("尚未接入真实搜索结果，外部事实部分为占位。")

        recommendations = [
            "优先完成高价值追问，再执行真实 Search/Calculation MCP。",
            "前端应按照 next_action 渲染表单、进度区和报告预览，不在客户端编排流程。",
        ]
        open_questions = [
            question.question_text
            for question in session.clarification_questions
            if not question.answered
        ]

        return AnalysisReport(
            summary="主循环骨架已具备：可按状态推进会话、规划 MCP、沉淀结论，并返回前端下一步动作。",
            assumptions=assumptions,
            recommendations=recommendations,
            open_questions=open_questions,
            chart_refs=[artifact.chart_id for artifact in session.chart_artifacts],
        )
