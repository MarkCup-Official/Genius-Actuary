from __future__ import annotations

import json
from typing import Any, Callable, TypeVar

import httpx

from app.domain.models import (
    AnalysisLoopPlan,
    AnalysisMode,
    AnalysisReport,
    AnalysisSession,
    BudgetLineItem,
    BudgetSummary,
    CalculationTask,
    ChartTask,
    ClarificationQuestion,
    MajorConclusionItem,
    OptionProfile,
    ReportTable,
    SearchTask,
    SessionEvent,
)
from app.prompts import (
    build_clarification_prompts,
    build_planning_prompts,
    build_reporting_prompts,
)


def _make_question(
    *,
    question_text: str,
    purpose: str,
    options: list[str] | None = None,
    priority: int = 1,
    question_group: str = "",
    input_hint: str = "",
    example_answer: str = "",
    allow_skip: bool = True,
) -> ClarificationQuestion:
    return ClarificationQuestion(
        question_text=question_text,
        purpose=purpose,
        options=options or [],
        priority=priority,
        question_group=question_group,
        input_hint=input_hint,
        example_answer=example_answer,
        allow_skip=allow_skip,
        allow_custom_input=True,
    )


def _normalized_problem(problem: str) -> str:
    return problem.strip().lower()


def _cost_scenario(problem: str) -> str:
    normalized = _normalized_problem(problem)
    if "比赛" in problem or "赛事" in problem or "competition" in normalized:
        return "competition"
    if "留学" in problem or "exchange" in normalized or "study abroad" in normalized:
        return "study_abroad"
    return "generic_cost"


def _decision_scenario(problem: str) -> str:
    normalized = _normalized_problem(problem)
    if "留学" in problem or "graduate" in normalized or "study abroad" in normalized:
        return "study_path"
    if "买车" in problem or "car" in normalized or "transit" in normalized:
        return "mobility"
    return "generic_choice"


def _render_cost_range(option: OptionProfile) -> str:
    if option.estimated_cost_base is None:
        return "未量化"
    if option.estimated_cost_low is None or option.estimated_cost_high is None:
        return f"{option.estimated_cost_base:.0f} {option.currency}"
    return f"{option.estimated_cost_low:.0f} - {option.estimated_cost_high:.0f} {option.currency}"


def _table_from_options(title: str, options: list[OptionProfile]) -> ReportTable:
    return ReportTable(
        title=title,
        columns=["方案", "主要优点", "主要缺点", "成本区间", "适合谁", "关键风险", "综合分"],
        rows=[
            {
                "方案": option.name,
                "主要优点": "；".join(option.pros),
                "主要缺点": "；".join(option.cons),
                "成本区间": _render_cost_range(option),
                "适合谁": "；".join(option.fit_for),
                "关键风险": "；".join(option.caution_flags),
                "综合分": option.score if option.score is not None else "",
            }
            for option in options
        ],
        notes="综合分用于帮助排序，不应被理解为绝对真值。",
    )


def _table_from_budget_items(title: str, items: list[BudgetLineItem]) -> ReportTable:
    return ReportTable(
        title=title,
        columns=["项目", "类别", "类型", "低位", "基准", "高位", "币种", "依据"],
        rows=[
            {
                "项目": item.name,
                "类别": item.category,
                "类型": item.item_type,
                "低位": item.low,
                "基准": item.base,
                "高位": item.high,
                "币种": item.currency,
                "依据": item.rationale,
            }
            for item in items
        ],
        notes="低位、基准和高位共同定义预算区间。",
    )


def _build_cost_initial_questions(problem: str) -> list[ClarificationQuestion]:
    questions = [
        _make_question(
            question_text="这次计划的目标结果是什么，最低成功标准是什么？",
            purpose="预算估算必须先知道你到底想把事情做到什么程度。",
            question_group="scope",
            input_hint="可以写规模、质量、人数、曝光或转化目标。",
            example_answer="想办一场 300 人规模的比赛，至少做到收支基本平衡。",
            allow_skip=False,
        ),
        _make_question(
            question_text="计划发生在什么地区、时间和规模下？",
            purpose="地区、周期和规模会显著改变场地、人力和物流成本。",
            question_group="context",
            input_hint="例如城市、天数、人数、筹备周期。",
            example_answer="上海，2 天赛程，筹备 6 周。",
            allow_skip=False,
        ),
        _make_question(
            question_text="你最担心的预算黑洞是什么？",
            purpose="隐藏成本往往决定最终预算是否失控。",
            options=["人力", "场地", "设备", "宣传", "机会成本", "资金占用"],
            question_group="risk",
            priority=2,
            input_hint="也可以直接补充你已经担心的支出项。",
            example_answer="最担心场地押金和临时加班的人力成本。",
        ),
        _make_question(
            question_text="是否存在收入、赞助、补贴或其他回收来源？",
            purpose="结果页需要同时展示成本项和回收项，才能给出净预算范围。",
            options=["门票", "赞助", "报名费", "补贴", "暂无明确收入"],
            question_group="revenue",
            priority=2,
            input_hint="如果有，尽量说明来源和大致把握度。",
            example_answer="有赞助和报名费，但金额还没锁定。",
        ),
    ]

    if _cost_scenario(problem) == "study_abroad":
        questions.append(
            _make_question(
                question_text="目标国家、学校或项目是否已经明确？",
                purpose="学费、生活费、签证和奖学金差异都强依赖具体地区和项目。",
                question_group="education",
                input_hint="如果还没定，也可以给几个备选。",
                example_answer="美国一年制硕士，商科方向。",
                allow_skip=False,
            )
        )
    return questions


def _build_multi_initial_questions(problem: str) -> list[ClarificationQuestion]:
    questions = [
        _make_question(
            question_text="你这次真正要解决的核心问题是什么？",
            purpose="多项决策必须围绕真实目标，而不是表面选项名义进行比较。",
            question_group="goal",
            input_hint="例如降低风险、提升长期收益、尽快开始、减少花费。",
            example_answer="我想知道未来 3 年哪条路更稳妥、回报更高。",
            allow_skip=False,
        ),
        _make_question(
            question_text="你目前已经在考虑哪些具体方案？",
            purpose="结果页需要并列输出方案优缺点和对比表，所以必须先明确方案集合。",
            question_group="options",
            input_hint="可以直接用逗号分隔多个方案。",
            example_answer="去美国留学、留在国内、先工作两年再决定。",
            allow_skip=False,
        ),
        _make_question(
            question_text="有哪些不能突破的硬约束？",
            purpose="硬约束会直接淘汰掉一部分看起来不错但不可执行的方案。",
            options=["预算上限", "时间窗口", "家庭因素", "风险承受度", "职业限制"],
            question_group="constraints",
            priority=1,
            input_hint="如果有预算或时间上限，最好直接写出来。",
            example_answer="预算最好不要超过 100 万，且不希望脱产太久。",
            allow_skip=False,
        ),
        _make_question(
            question_text="如果没有完美方案，你更愿意优先保住什么？",
            purpose="这决定最终推荐应该偏稳妥、低成本，还是偏长期收益和成长。",
            options=["现金流压力更小", "长期成长更强", "风险更低", "行动更快", "保留更多选择权"],
            question_group="tradeoff",
            priority=2,
            input_hint="可以写 1 到 2 个最重要的偏好。",
            example_answer="优先保住现金流和选择权。",
        ),
    ]

    if _decision_scenario(problem) == "mobility":
        questions.append(
            _make_question(
                question_text="你的高频出行情景是什么？",
                purpose="买车和继续公共交通的优劣很依赖真实使用场景。",
                question_group="usage",
                input_hint="例如每天通勤、周末跨城、夜间出行、带家人等。",
                example_answer="工作日每天通勤 18 公里，周末偶尔跨城。",
                allow_skip=False,
            )
        )
    return questions


def _build_budget_report(session: AnalysisSession) -> AnalysisReport:
    scenario = _cost_scenario(session.problem_statement)
    if scenario == "competition":
        items = [
            BudgetLineItem(name="场地租用", category="执行成本", item_type="cost", low=80000, base=120000, high=180000, rationale="按 2 天中型场地估算。"),
            BudgetLineItem(name="工作人员工资", category="人力成本", item_type="cost", low=60000, base=100000, high=160000, rationale="含执行与加班成本。"),
            BudgetLineItem(name="设备与技术", category="执行成本", item_type="cost", low=40000, base=70000, high=110000, rationale="含音响、灯光、直播等。"),
            BudgetLineItem(name="宣传与转化", category="市场成本", item_type="cost", low=30000, base=60000, high=90000, rationale="含物料和投放。"),
            BudgetLineItem(name="组织机会成本", category="隐性成本", item_type="opportunity_cost", low=30000, base=50000, high=90000, rationale="团队准备期的时间占用。"),
            BudgetLineItem(name="赞助收入", category="现金回流", item_type="income", low=120000, base=200000, high=400000, rationale="取决于招商质量。"),
            BudgetLineItem(name="门票与报名费", category="现金回流", item_type="income", low=30000, base=90000, high=180000, rationale="取决于转化率和到场率。"),
        ]
        summary = BudgetSummary(
            currency="CNY",
            total_cost_low=240000,
            total_cost_base=400000,
            total_cost_high=630000,
            total_income_low=150000,
            total_income_base=290000,
            total_income_high=580000,
            net_low=90000,
            net_base=110000,
            net_high=50000,
            reserve_note="建议再额外预留 15% 到 20% 现金缓冲。",
        )
        markdown = (
            "## 预算结论\n"
            "这类比赛项目更像一个**高执行成本、回本依赖招商和到场率**的计划。"
            "建议把 **40 万人民币左右** 视为基准总成本，再单独准备安全缓冲。\n\n"
            "## 关键提醒\n"
            "- 最容易被低估的是人力、场地附加费用和组织方机会成本。\n"
            "- 高位收入不能在合同未落实前视为已到账现金。\n"
            "- 如果目标是稳妥落地，建议先按基准成本做决策。"
        )
        report = AnalysisReport(
            summary="建议以 24 万到 63 万人民币作为成本区间，基准总成本约 40 万；若赞助未锁定，现金压力会快速上升。",
            assumptions=["按中型线下赛事估算。", "基准收入只作为参考，不视为已实现。"],
            recommendations=[
                "先锁定场地、人力和设备报价，再决定赛事规模。",
                "把赞助收入和已发生支出拆开看，不要混在同一现金池里。",
                "单独为延期、临时加项和组织时间占用预留缓冲。",
            ],
            open_questions=["城市、场地级别和赞助把握度仍会显著影响区间。"],
            markdown=markdown,
            budget_summary=summary,
            budget_items=items,
            tables=[_table_from_budget_items("比赛预算拆分", items)],
        )
    elif scenario == "study_abroad":
        items = [
            BudgetLineItem(name="学费", category="直接成本", item_type="cost", low=200000, base=320000, high=480000, rationale="按一年制海外项目估算。"),
            BudgetLineItem(name="住宿与生活费", category="直接成本", item_type="cost", low=120000, base=180000, high=260000, rationale="受城市差异影响大。"),
            BudgetLineItem(name="签证、保险与机票", category="直接成本", item_type="cost", low=30000, base=60000, high=100000, rationale="包含一次性手续费用。"),
            BudgetLineItem(name="机会成本", category="隐性成本", item_type="opportunity_cost", low=80000, base=150000, high=260000, rationale="按一年少工作或少积累收入估算。"),
            BudgetLineItem(name="奖学金/补贴", category="现金回流", item_type="income", low=0, base=120000, high=260000, rationale="受项目和学校差异影响。"),
        ]
        summary = BudgetSummary(
            currency="CNY",
            total_cost_low=430000,
            total_cost_base=710000,
            total_cost_high=1100000,
            total_income_low=0,
            total_income_base=120000,
            total_income_high=260000,
            net_low=430000,
            net_base=590000,
            net_high=840000,
            reserve_note="如果预算上限接近 60 万，只有在奖学金较稳时才适合推进。",
        )
        report = AnalysisReport(
            summary="建议把 43 万到 110 万人民币视为总预算区间；如果没有较稳的奖学金，基准净投入约在 59 万人民币。",
            assumptions=["按一年制海外项目估算。", "机会成本按一年收入损失近似。"],
            recommendations=[
                "先确认学校、地区和奖学金，再决定是否进入申请和缴费阶段。",
                "把机会成本单列，不要只看学费和生活费。",
            ],
            open_questions=["目标国家、学校层级和奖学金结果仍会改变区间。"],
            markdown=(
                "## 预算结论\n"
                "这类留学方案更像一个**高机会成本、强依赖奖学金和项目匹配**的预算决策。"
                "在没有稳定资助前，建议把 **59 万人民币左右** 视为基准净投入。"
            ),
            budget_summary=summary,
            budget_items=items,
            tables=[_table_from_budget_items("留学预算拆分", items)],
        )
    else:
        items = [
            BudgetLineItem(name="固定投入", category="直接成本", item_type="cost", low=50000, base=90000, high=160000, rationale="基础资源、人力与执行协调。"),
            BudgetLineItem(name="可变投入", category="直接成本", item_type="cost", low=30000, base=70000, high=130000, rationale="受规模和外部报价波动影响。"),
            BudgetLineItem(name="机会成本", category="隐性成本", item_type="opportunity_cost", low=20000, base=50000, high=90000, rationale="取决于时间占用与替代机会。"),
            BudgetLineItem(name="潜在回收", category="现金回流", item_type="income", low=0, base=40000, high=100000, rationale="由收入模式和执行成功率决定。"),
        ]
        summary = BudgetSummary(
            currency="CNY",
            total_cost_low=100000,
            total_cost_base=210000,
            total_cost_high=380000,
            total_income_low=0,
            total_income_base=40000,
            total_income_high=100000,
            net_low=100000,
            net_base=170000,
            net_high=280000,
            reserve_note="建议先按基准值准备，再留出 15% 机动空间。",
        )
        report = AnalysisReport(
            summary="建议把 10 万到 38 万人民币视为预算区间，基准总投入约 21 万；只有当回收路径清晰时才适合往高位推进。",
            assumptions=["当前按通用项目预算结构估算。"],
            recommendations=["先拆出固定成本和机会成本。", "把收入或回收路径单列。"],
            open_questions=["规模、地区和执行标准仍会改变预算区间。"],
            markdown="## 预算结论\n当前更适合把这项计划当作一个需要看清总投入上限和回收路径的预算决策。",
            budget_summary=summary,
            budget_items=items,
            tables=[_table_from_budget_items("预算拆分", items)],
        )

    report.chart_refs = [artifact.chart_id for artifact in session.chart_artifacts]
    return report


def _build_multi_report(session: AnalysisSession) -> AnalysisReport:
    scenario = _decision_scenario(session.problem_statement)
    if scenario == "study_path":
        options = [
            OptionProfile(name="出国留学", summary="成长上限高，但成本和不确定性都更高。", pros=["视野和环境变化显著", "长期成长上限更高"], cons=["成本高", "执行链路复杂"], fit_for=["目标明确偏国际化发展"], caution_flags=["预算可能接近百万元"], estimated_cost_low=700000, estimated_cost_base=1000000, estimated_cost_high=1300000, currency="CNY", score=7.4, confidence=0.78),
            OptionProfile(name="留在国内发展", summary="成本和路径确定性更稳，但环境变化较小。", pros=["生活成本低很多", "路径更稳"], cons=["环境切换收益较弱"], fit_for=["预算更紧、看重稳定性"], caution_flags=["如果真正目标是环境切换，回报会打折"], estimated_cost_low=60000, estimated_cost_base=100000, estimated_cost_high=180000, currency="CNY", score=7.8, confidence=0.8),
            OptionProfile(name="先工作再决定", summary="兼顾现金流和选择权，适合目标尚未完全清晰的人。", pros=["先积累收入和经验", "保留未来转向空间"], cons=["会延后继续深造"], fit_for=["更看重现金流和选择权"], caution_flags=["如果拖太久，切换学习状态会更难"], estimated_cost_low=100000, estimated_cost_base=160000, estimated_cost_high=260000, currency="CNY", score=8.3, confidence=0.84),
        ]
        summary = "默认推荐先工作再决定；若你已明确偏国际化发展且能承受约 100 万人民币级别投入，出国留学才更值得直接推进。"
        markdown = (
            "## 决策结论\n"
            "当前更稳妥的默认推荐是 **先工作再决定**。"
            "如果目标非常明确、资金或奖学金较稳，出国留学可以升级为首选；"
            "如果最看重成本控制和路径确定性，留在国内会更稳。"
        )
    elif scenario == "mobility":
        options = [
            OptionProfile(name="买车", summary="便利最强，但固定成本也最高。", pros=["出行灵活", "高频刚需场景友好"], cons=["固定支出高", "停车保险折旧持续存在"], fit_for=["高频刚需通勤"], caution_flags=["现金流压力明显"], estimated_cost_low=80000, estimated_cost_base=120000, estimated_cost_high=180000, currency="CNY", score=6.9, confidence=0.76),
            OptionProfile(name="继续公共交通", summary="成本最低且最稳，但灵活性有限。", pros=["总成本低", "保留现金流"], cons=["复杂场景不够灵活"], fit_for=["预算敏感、通勤可被覆盖"], caution_flags=["高峰和跨城场景体验较差"], estimated_cost_low=12000, estimated_cost_base=24000, estimated_cost_high=42000, currency="CNY", score=8.1, confidence=0.81),
            OptionProfile(name="混合方案", summary="在成本和便利之间取中间解，适合作为过渡。", pros=["不过早承担买车固定成本", "高需求时仍可补充手段"], cons=["体验不如拥有车辆稳定"], fit_for=["需求仍在观察阶段"], caution_flags=["需要持续记录真实出行成本"], estimated_cost_low=18000, estimated_cost_base=36000, estimated_cost_high=60000, currency="CNY", score=8.4, confidence=0.79),
        ]
        summary = "当前更推荐混合方案或继续公共交通；只有在高频刚需明确且现金流充足时，买车才更有优势。"
        markdown = "## 决策结论\n当前更推荐混合方案或继续公共交通，而不是立即买车。"
    else:
        options = [
            OptionProfile(name="保守推进", summary="优先降低成本和执行风险。", pros=["下行风险更小", "更容易快速落地"], cons=["长期收益可能受限"], fit_for=["更看重稳妥的人"], caution_flags=["可能错过高回报窗口"], estimated_cost_low=50000, estimated_cost_base=80000, estimated_cost_high=120000, currency="CNY", score=7.8, confidence=0.7),
            OptionProfile(name="积极推进", summary="追求更高上限，但成本和不确定性都更大。", pros=["长期收益上限更高", "行动更果断"], cons=["资金和执行压力更大"], fit_for=["更看重成长和速度的人"], caution_flags=["前提不成立时损失会放大"], estimated_cost_low=100000, estimated_cost_base=180000, estimated_cost_high=320000, currency="CNY", score=7.2, confidence=0.66),
        ]
        summary = "建议先采用更稳妥的默认方案，再根据新增证据决定是否切换到高投入高收益路径。"
        markdown = "## 决策结论\n在当前信息下，更建议先采用保守推进作为默认路径。"

    report = AnalysisReport(
        summary=summary,
        assumptions=["当前比较基于结构化回答和公开证据，不是不可变结论。"],
        recommendations=[
            "先确认真正的目标优先级，再决定是否接受高成本或高不确定性。",
            "把最不能接受的代价写清楚，再看方案排序是否需要调整。",
        ],
        open_questions=["目标清晰度和关键前提是否成立仍会影响最终排序。"],
        markdown=markdown,
        option_profiles=options,
        tables=[_table_from_options("方案平行对比", options)],
    )
    report.chart_refs = [artifact.chart_id for artifact in session.chart_artifacts]
    return report


class MockAnalysisAdapter:
    def generate_initial_questions(self, session: AnalysisSession) -> list[ClarificationQuestion]:
        if session.mode == AnalysisMode.MULTI_OPTION:
            return _build_multi_initial_questions(session.problem_statement)
        return _build_cost_initial_questions(session.problem_statement)

    def plan_next_round(self, session: AnalysisSession) -> AnalysisLoopPlan:
        unanswered = [question for question in session.clarification_questions if not question.answered]
        if unanswered:
            return AnalysisLoopPlan(
                major_conclusions=[
                    MajorConclusionItem(
                        content="The current clarification round still has unanswered questions.",
                        conclusion_type="inference",
                        confidence=0.72,
                    )
                ],
                reasoning_focus="Wait for the remaining user-specific answers.",
                stop_reason="Waiting for clarification answers before the next planning round.",
            )

        if not session.evidence_items:
            tasks = (
                [
                    SearchTask(
                        search_topic="方案对比证据",
                        search_goal="验证不同方案在成本、收益、风险和门槛上的现实差异。",
                        search_scope="优先看权威来源和最新公开信息。",
                        suggested_queries=[session.problem_statement, f"{session.problem_statement} pros cons"],
                        required_fields=["cost", "upside", "risk", "conditions"],
                        freshness_requirement="high",
                        task_group="option-comparison",
                    )
                ]
                if session.mode == AnalysisMode.MULTI_OPTION
                else [
                    SearchTask(
                        search_topic="预算基准",
                        search_goal="验证最主要成本项、潜在收入项和隐性成本来源。",
                        search_scope="优先看最近 12 个月、与问题直接相关的来源。",
                        suggested_queries=[session.problem_statement, f"{session.problem_statement} 费用", f"{session.problem_statement} 成本"],
                        required_fields=["price range", "source", "date"],
                        freshness_requirement="high",
                        task_group="budget-benchmark",
                    )
                ]
            )
            return AnalysisLoopPlan(
                search_tasks=tasks,
                major_conclusions=[
                    MajorConclusionItem(
                        content="External evidence should be gathered before the final report is written.",
                        conclusion_type="fact",
                        confidence=0.77,
                    )
                ],
                reasoning_focus="Collect external evidence for the most decision-relevant uncertainties.",
                stop_reason="Search should run before the final report.",
            )

        if len(session.answers) < 5 and len(session.clarification_questions) < 7:
            follow_up = (
                _make_question(
                    question_text="如果最后只能保留一个方案，你最不能接受的代价是什么？",
                    purpose="帮助确定最终推荐应该优先保住什么。",
                    options=["高成本", "高风险", "时间太长", "回报太慢"],
                    question_group="tradeoff",
                    priority=2,
                    input_hint="也可以补充你最不想承担的后果。",
                    example_answer="最不能接受高成本但回报还不确定。",
                )
                if session.mode == AnalysisMode.MULTI_OPTION
                else _make_question(
                    question_text="你希望最终预算结果更偏保守、基准还是冲高配置？",
                    purpose="帮助结果页决定默认展示哪一个预算姿态。",
                    options=["尽量保守", "以基准预算为主", "愿意为更高效果投入"],
                    question_group="budget-style",
                    priority=2,
                    input_hint="可以说明你更关心安全缓冲还是效果上限。",
                    example_answer="希望先看保守和基准预算。",
                )
            )
            return AnalysisLoopPlan(
                clarification_questions=[follow_up],
                major_conclusions=[
                    MajorConclusionItem(
                        content="One more follow-up answer would materially improve the final recommendation.",
                        conclusion_type="inference",
                        confidence=0.74,
                    )
                ],
                reasoning_focus="Resolve the last major trade-off before writing the report.",
                stop_reason="A final follow-up question would sharpen the result page.",
            )

        return AnalysisLoopPlan(
            major_conclusions=[
                MajorConclusionItem(
                    content="The current session now has enough structure for a bounded final report.",
                    conclusion_type="inference",
                    confidence=0.83,
                )
            ],
            ready_for_report=True,
            reasoning_focus="Consolidate the evidence and write the final report.",
            stop_reason="No additional clarification or search is required for the current snapshot.",
        )

    def build_report(self, session: AnalysisSession) -> AnalysisReport:
        if session.mode == AnalysisMode.MULTI_OPTION:
            return _build_multi_report(session)
        return _build_budget_report(session)


class LLMInvocationError(RuntimeError):
    pass


class LLMOutputValidationError(ValueError):
    pass


T = TypeVar("T")


class OpenAICompatibleAnalysisAdapter(MockAnalysisAdapter):
    def __init__(
        self,
        *,
        provider: str,
        base_url: str,
        api_key: str,
        model: str,
        timeout_seconds: float = 30,
        retry_attempts: int = 3,
    ) -> None:
        self.provider = provider
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.retry_attempts = max(1, retry_attempts)

    def generate_initial_questions(self, session: AnalysisSession) -> list[ClarificationQuestion]:
        system_prompt, user_prompt = build_clarification_prompts(session)
        return self._request_json_with_retry(
            session=session,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            operation="generate clarification questions",
            validator=self._validate_initial_questions_payload,
        )

    def plan_next_round(self, session: AnalysisSession) -> AnalysisLoopPlan:
        return self._request_json_with_retry(
            session=session,
            operation="plan the next analysis round",
            validator=self._validate_planning_payload,
            prompt_builder=lambda current_prompt_mode: build_planning_prompts(
                session,
                compact=(current_prompt_mode == "compact"),
            ),
        )

    def build_report(self, session: AnalysisSession) -> AnalysisReport:
        system_prompt, user_prompt = build_reporting_prompts(session)
        return self._request_json_with_retry(
            session=session,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            operation="build the final report",
            validator=lambda payload: self._validate_report_payload(session, payload),
        )

    def _validate_initial_questions_payload(
        self,
        payload: dict[str, Any],
    ) -> list[ClarificationQuestion]:
        questions = self._parse_questions(payload.get("questions"))
        if not questions:
            raise LLMOutputValidationError(
                "The response did not contain usable clarification questions."
            )
        return questions

    def _validate_planning_payload(self, payload: dict[str, Any]) -> AnalysisLoopPlan:
        clarification_questions = self._parse_questions(payload.get("clarification_questions"))
        search_tasks = self._parse_search_tasks(payload.get("search_tasks"))
        calculation_tasks = self._parse_calculation_tasks(payload.get("calculation_tasks"))
        chart_tasks = self._parse_chart_tasks(payload.get("chart_tasks"))
        conclusions = self._parse_conclusions(payload.get("major_conclusions"))
        ready_for_report = self._coerce_bool(payload.get("ready_for_report", False), default=False)
        reasoning_focus = str(payload.get("reasoning_focus", "")).strip()
        stop_reason = str(payload.get("stop_reason", "")).strip()

        if not (
            clarification_questions
            or search_tasks
            or calculation_tasks
            or chart_tasks
            or conclusions
            or ready_for_report
        ):
            raise LLMOutputValidationError(
                "The response did not contain any usable questions, tasks, conclusions, or report readiness signal."
            )

        return AnalysisLoopPlan(
            clarification_questions=clarification_questions,
            search_tasks=search_tasks,
            calculation_tasks=calculation_tasks,
            chart_tasks=chart_tasks,
            major_conclusions=conclusions,
            ready_for_report=ready_for_report,
            reasoning_focus=reasoning_focus,
            stop_reason=stop_reason,
        )

    def _validate_report_payload(
        self,
        session: AnalysisSession,
        payload: dict[str, Any],
    ) -> AnalysisReport:
        summary = str(payload.get("summary", "")).strip()
        if not summary:
            raise LLMOutputValidationError(
                "The report response did not include a summary."
            )

        report = AnalysisReport(
            summary=summary,
            assumptions=self._string_list(payload.get("assumptions")),
            recommendations=self._string_list(payload.get("recommendations")),
            open_questions=self._string_list(payload.get("open_questions")),
            chart_refs=[artifact.chart_id for artifact in session.chart_artifacts],
            markdown=str(payload.get("markdown", "")).strip(),
            tables=self._parse_report_tables(payload.get("tables")),
        )
        if session.mode == AnalysisMode.MULTI_OPTION:
            report.option_profiles = self._parse_option_profiles(payload.get("option_profiles"))
            if not report.option_profiles and not report.tables:
                raise LLMOutputValidationError(
                    "The multi-option report response did not include usable option comparisons."
                )
        else:
            report.budget_summary = self._parse_budget_summary(payload.get("budget_summary"))
            report.budget_items = self._parse_budget_items(payload.get("budget_items"))
            if report.budget_summary is None and not report.budget_items and not report.tables:
                raise LLMOutputValidationError(
                    "The budget report response did not include a usable budget summary, budget items, or tables."
                )
        return report

    def _parse_questions(self, value: Any) -> list[ClarificationQuestion]:
        if not isinstance(value, list):
            return []
        parsed: list[ClarificationQuestion] = []
        for item in value[:6]:
            if not isinstance(item, dict):
                continue
            parsed.append(
                ClarificationQuestion(
                    question_text=str(item.get("question_text", "")).strip()
                    or "What else should we clarify before the next round?",
                    purpose=str(item.get("purpose", "")).strip()
                    or "Collect the missing information for the next round.",
                    options=self._string_list(item.get("options")),
                    allow_custom_input=True,
                    allow_skip=self._coerce_bool(item.get("allow_skip", True), default=True),
                    priority=self._coerce_priority(item.get("priority", 1)),
                    question_group=str(item.get("question_group", "")).strip(),
                    input_hint=str(item.get("input_hint", "")).strip(),
                    example_answer=str(item.get("example_answer", "")).strip(),
                )
            )
        return parsed

    def _parse_search_tasks(self, value: Any) -> list[SearchTask]:
        if not isinstance(value, list):
            return []
        parsed: list[SearchTask] = []
        for item in value[:5]:
            if not isinstance(item, dict):
                continue
            parsed.append(
                SearchTask(
                    search_topic=str(item.get("search_topic", "")).strip() or "External benchmark",
                    search_goal=str(item.get("search_goal", "")).strip() or "Validate the most relevant public facts.",
                    search_scope=str(item.get("search_scope", "")).strip() or "Prioritize recent authoritative sources.",
                    suggested_queries=self._string_list(item.get("suggested_queries")),
                    required_fields=self._string_list(item.get("required_fields")),
                    freshness_requirement=str(item.get("freshness_requirement", "high")).strip() or "high",
                    task_group=str(item.get("task_group", "")).strip(),
                    notes=str(item.get("notes", "")).strip(),
                )
            )
        return parsed

    def _parse_calculation_tasks(self, value: Any) -> list[CalculationTask]:
        if not isinstance(value, list):
            return []
        parsed: list[CalculationTask] = []
        for item in value[:5]:
            if not isinstance(item, dict):
                continue
            input_params = item.get("input_params")
            parsed.append(
                CalculationTask(
                    objective=str(item.get("objective", "")).strip() or "Deterministic estimate",
                    formula_hint=str(item.get("formula_hint", "")).strip() or "0",
                    input_params=input_params if isinstance(input_params, dict) else {},
                    unit=str(item.get("unit", "")).strip(),
                )
            )
        return parsed

    def _parse_chart_tasks(self, value: Any) -> list[ChartTask]:
        if not isinstance(value, list):
            return []
        parsed: list[ChartTask] = []
        for item in value[:5]:
            if not isinstance(item, dict):
                continue
            parsed.append(
                ChartTask(
                    objective=str(item.get("objective", "")).strip() or "Visual comparison",
                    chart_type=str(item.get("chart_type", "bar")).strip() or "bar",
                    title=str(item.get("title", "")).strip() or "Comparison chart",
                    source_task_ids=self._string_list(item.get("source_task_ids")),
                    preferred_unit=str(item.get("preferred_unit", "")).strip(),
                    notes=str(item.get("notes", "")).strip(),
                )
            )
        return parsed

    def _parse_conclusions(self, value: Any) -> list[MajorConclusionItem]:
        if not isinstance(value, list):
            return []
        parsed: list[MajorConclusionItem] = []
        for item in value[:6]:
            if not isinstance(item, dict):
                continue
            parsed.append(
                MajorConclusionItem(
                    content=str(item.get("content", "")).strip() or "Initial inference prepared by the analysis model.",
                    conclusion_type=str(item.get("conclusion_type", "inference")).strip() or "inference",
                    basis_refs=self._string_list(item.get("basis_refs")),
                    confidence=self._coerce_float(item.get("confidence"), default=0.6),
                )
            )
        return parsed

    def _parse_budget_summary(self, value: Any) -> BudgetSummary | None:
        if not isinstance(value, dict):
            return None
        return BudgetSummary(
            currency=str(value.get("currency", "CNY")).strip() or "CNY",
            total_cost_low=self._coerce_float(value.get("total_cost_low"), default=0.0),
            total_cost_base=self._coerce_float(value.get("total_cost_base"), default=0.0),
            total_cost_high=self._coerce_float(value.get("total_cost_high"), default=0.0),
            total_income_low=self._coerce_float(value.get("total_income_low"), default=0.0),
            total_income_base=self._coerce_float(value.get("total_income_base"), default=0.0),
            total_income_high=self._coerce_float(value.get("total_income_high"), default=0.0),
            net_low=self._coerce_float(value.get("net_low"), default=0.0),
            net_base=self._coerce_float(value.get("net_base"), default=0.0),
            net_high=self._coerce_float(value.get("net_high"), default=0.0),
            reserve_note=str(value.get("reserve_note", "")).strip(),
        )

    def _parse_budget_items(self, value: Any) -> list[BudgetLineItem]:
        if not isinstance(value, list):
            return []
        parsed: list[BudgetLineItem] = []
        for item in value[:24]:
            if not isinstance(item, dict):
                continue
            parsed.append(
                BudgetLineItem(
                    name=str(item.get("name", "")).strip() or "Unlabeled budget item",
                    category=str(item.get("category", "")).strip() or "General",
                    item_type=str(item.get("item_type", "cost")).strip() or "cost",
                    low=self._coerce_float(item.get("low"), default=0.0),
                    base=self._coerce_float(item.get("base"), default=0.0),
                    high=self._coerce_float(item.get("high"), default=0.0),
                    currency=str(item.get("currency", "CNY")).strip() or "CNY",
                    rationale=str(item.get("rationale", "")).strip(),
                    basis_refs=self._string_list(item.get("basis_refs")),
                    confidence=self._coerce_float(item.get("confidence"), default=0.6),
                )
            )
        return parsed

    def _parse_option_profiles(self, value: Any) -> list[OptionProfile]:
        if not isinstance(value, list):
            return []
        parsed: list[OptionProfile] = []
        for item in value[:8]:
            if not isinstance(item, dict):
                continue
            parsed.append(
                OptionProfile(
                    name=str(item.get("name", "")).strip() or "Unnamed option",
                    summary=str(item.get("summary", "")).strip(),
                    pros=self._string_list(item.get("pros")),
                    cons=self._string_list(item.get("cons")),
                    conditions=self._string_list(item.get("conditions")),
                    fit_for=self._string_list(item.get("fit_for")),
                    caution_flags=self._string_list(item.get("caution_flags")),
                    estimated_cost_low=self._coerce_optional_float(item.get("estimated_cost_low")),
                    estimated_cost_base=self._coerce_optional_float(item.get("estimated_cost_base")),
                    estimated_cost_high=self._coerce_optional_float(item.get("estimated_cost_high")),
                    currency=str(item.get("currency", "CNY")).strip() or "CNY",
                    score=self._coerce_optional_float(item.get("score")),
                    confidence=self._coerce_float(item.get("confidence"), default=0.6),
                    basis_refs=self._string_list(item.get("basis_refs")),
                )
            )
        return parsed

    def _parse_report_tables(self, value: Any) -> list[ReportTable]:
        if not isinstance(value, list):
            return []
        parsed: list[ReportTable] = []
        for item in value[:8]:
            if not isinstance(item, dict):
                continue
            rows = item.get("rows")
            parsed_rows = [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
            parsed.append(
                ReportTable(
                    title=str(item.get("title", "")).strip() or "Structured table",
                    columns=self._string_list(item.get("columns")),
                    rows=parsed_rows,
                    notes=str(item.get("notes", "")).strip(),
                )
            )
        return parsed

    def _request_json_with_retry(
        self,
        *,
        session: AnalysisSession,
        operation: str,
        validator: Callable[[dict[str, Any]], T] | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        prompt_builder: Callable[[str], tuple[str, str]] | None = None,
    ) -> T | dict[str, Any]:
        last_error: Exception | None = None
        current_prompt_mode = "full"
        if prompt_builder is not None:
            current_system_prompt, current_user_prompt = prompt_builder(current_prompt_mode)
        else:
            if system_prompt is None or user_prompt is None:
                raise ValueError("system_prompt and user_prompt are required when prompt_builder is absent.")
            current_system_prompt = system_prompt
            current_user_prompt = user_prompt
        current_timeout_seconds = self.timeout_seconds
        for attempt in range(1, self.retry_attempts + 1):
            request_payload = self._build_request_payload(
                system_prompt=current_system_prompt,
                user_prompt=current_user_prompt,
            )
            session.events.append(
                SessionEvent(
                    kind="llm_request_started",
                    payload={
                        "operation": operation,
                        "attempt": attempt,
                        "provider": self.provider,
                        "base_url": self.base_url,
                        "model": self.model,
                        "prompt_mode": current_prompt_mode,
                        "timeout_seconds": current_timeout_seconds,
                        "system_prompt": current_system_prompt,
                        "user_prompt": current_user_prompt,
                        "request_json": request_payload,
                    },
                )
            )
            try:
                payload = self._request_json(
                    session=session,
                    operation=operation,
                    attempt=attempt,
                    system_prompt=current_system_prompt,
                    user_prompt=current_user_prompt,
                    timeout_seconds=current_timeout_seconds,
                )
                if validator is None:
                    return payload
                return validator(payload)
            except Exception as error:
                last_error = error
                session.events.append(
                    SessionEvent(
                        kind="llm_request_failed",
                        payload={
                            "operation": operation,
                            "attempt": attempt,
                            "error_type": type(error).__name__,
                            "error_message": str(error),
                        },
                    )
                )
                if attempt == self.retry_attempts:
                    break
                if isinstance(error, (ValueError, LLMOutputValidationError)):
                    current_user_prompt = self._build_retry_user_prompt(
                        original_user_prompt=current_user_prompt,
                        error=error,
                    )
                    session.events.append(
                        SessionEvent(
                            kind="llm_retrying_after_invalid_output",
                            payload={
                                "operation": operation,
                                "attempt_completed": attempt,
                                "next_attempt": attempt + 1,
                                "error_type": type(error).__name__,
                                "error_message": str(error),
                            },
                        )
                    )
                elif isinstance(error, httpx.TimeoutException):
                    next_prompt_mode = "compact" if prompt_builder is not None else current_prompt_mode
                    timeout_bumped = max(current_timeout_seconds, self.timeout_seconds * 2)
                    if prompt_builder is not None:
                        current_prompt_mode = next_prompt_mode
                        current_system_prompt, current_user_prompt = prompt_builder(current_prompt_mode)
                    current_timeout_seconds = timeout_bumped
                    session.events.append(
                        SessionEvent(
                            kind="llm_retrying_after_timeout",
                            payload={
                                "operation": operation,
                                "attempt_completed": attempt,
                                "next_attempt": attempt + 1,
                                "next_prompt_mode": current_prompt_mode,
                                "next_timeout_seconds": current_timeout_seconds,
                                "error_type": type(error).__name__,
                                "error_message": str(error),
                            },
                        )
                    )
        detail = str(last_error) if last_error else "Unknown LLM invocation error."
        raise LLMInvocationError(
            f"Failed to {operation} after {self.retry_attempts} attempts. Last error: {detail}"
        ) from last_error

    @staticmethod
    def _build_retry_user_prompt(*, original_user_prompt: str, error: Exception) -> str:
        return (
            f"{original_user_prompt}\n\n"
            "The previous answer could not be used.\n"
            "Retry now and return exactly one valid JSON object that matches the requested schema.\n"
            "Do not include prose, markdown fences, comments, <think> tags, or duplicate keys.\n"
            f"Validation issue: {error}"
        )

    def _request_json(
        self,
        *,
        session: AnalysisSession,
        operation: str,
        attempt: int,
        system_prompt: str,
        user_prompt: str,
        timeout_seconds: float,
    ) -> dict[str, Any]:
        request_payload = self._build_request_payload(system_prompt=system_prompt, user_prompt=user_prompt)
        response = httpx.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=request_payload,
            timeout=httpx.Timeout(timeout_seconds, connect=min(timeout_seconds, 10.0)),
        )
        response.raise_for_status()
        payload = response.json()
        session.events.append(
            SessionEvent(
                kind="llm_response_received",
                payload={
                    "operation": operation,
                    "attempt": attempt,
                    "status_code": response.status_code,
                    "response_json": payload,
                },
            )
        )
        content = payload["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "".join(
                part.get("text", "")
                for part in content
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            )
        if not isinstance(content, str):
            raise ValueError("Model response content is not a string.")
        parsed = self._loads_json_object(content)
        if not isinstance(parsed, dict):
            raise ValueError("Model response is not a JSON object.")
        session.events.append(
            SessionEvent(
                kind="llm_response_parsed",
                payload={
                    "operation": operation,
                    "attempt": attempt,
                    "parsed_json": parsed,
                },
            )
        )
        return parsed

    def _build_request_payload(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        return {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
        }

    @staticmethod
    def _string_list(value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    @staticmethod
    def _coerce_bool(value: Any, *, default: bool) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "y", "on"}:
                return True
            if normalized in {"false", "0", "no", "n", "off", ""}:
                return False
        return default

    @staticmethod
    def _coerce_priority(value: Any, *, default: int = 1) -> int:
        if isinstance(value, bool):
            return default
        if isinstance(value, (int, float)):
            return max(1, int(value))
        if isinstance(value, str):
            normalized = value.strip().lower()
            if not normalized:
                return default
            try:
                return max(1, int(float(normalized)))
            except ValueError:
                aliases = {
                    "critical": 1,
                    "highest": 1,
                    "high": 2,
                    "medium": 3,
                    "normal": 3,
                    "moderate": 3,
                    "low": 4,
                    "lowest": 5,
                    "urgent": 1,
                    "important": 2,
                }
                return aliases.get(normalized, default)
        return default

    @staticmethod
    def _coerce_float(value: Any, *, default: float) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _coerce_optional_float(value: Any) -> float | None:
        if value in {None, ""}:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _loads_json_object(content: str) -> dict[str, Any]:
        content = content.strip()
        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("No JSON object found in model response.")
        parsed = json.loads(content[start : end + 1])
        if not isinstance(parsed, dict):
            raise ValueError("Extracted JSON payload is not an object.")
        return parsed
