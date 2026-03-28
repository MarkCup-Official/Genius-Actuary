const state = {
  baseUrl: "http://127.0.0.1:8000",
  bootstrap: null,
  sessionId: null,
  latestStep: null,
};

const elements = {
  baseUrl: document.querySelector("#base-url"),
  bootstrapBtn: document.querySelector("#bootstrap-btn"),
  refreshSessionBtn: document.querySelector("#refresh-session-btn"),
  connectionStatus: document.querySelector("#connection-status"),
  appName: document.querySelector("#app-name"),
  sessionId: document.querySelector("#session-id"),
  sessionStatus: document.querySelector("#session-status"),
  nextAction: document.querySelector("#next-action"),
  modeSelect: document.querySelector("#mode-select"),
  problemInput: document.querySelector("#problem-input"),
  createSessionBtn: document.querySelector("#create-session-btn"),
  questionForm: document.querySelector("#question-form"),
  questionCount: document.querySelector("#question-count"),
  submitAnswersBtn: document.querySelector("#submit-answers-btn"),
  promptBox: document.querySelector("#prompt-box"),
  reportPreview: document.querySelector("#report-preview"),
  evidenceList: document.querySelector("#evidence-list"),
  conclusionList: document.querySelector("#conclusion-list"),
  rawJson: document.querySelector("#raw-json"),
};

function setStatus(text, tone = "muted") {
  elements.connectionStatus.textContent = text;
  elements.connectionStatus.className = `status-pill ${tone}`;
}

function readBaseUrl() {
  state.baseUrl = elements.baseUrl.value.trim().replace(/\/$/, "");
  return state.baseUrl;
}

async function apiFetch(path, options = {}) {
  const baseUrl = readBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    body = { error: "Response is not valid JSON." };
  }

  if (!response.ok) {
    const detail = body?.detail || body?.error || response.statusText;
    throw new Error(`${response.status} ${detail}`);
  }
  return body;
}

function renderBootstrap(data) {
  state.bootstrap = data;
  elements.appName.textContent = data.app_name || "-";

  const select = elements.modeSelect;
  const currentValue = select.value;
  select.innerHTML = "";
  (data.supported_modes || []).forEach((mode) => {
    const option = document.createElement("option");
    option.value = mode;
    option.textContent = mode;
    if (mode === currentValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function renderQuestions(pendingQuestions) {
  elements.questionForm.innerHTML = "";

  if (!pendingQuestions.length) {
    elements.questionCount.textContent = "暂无待回答问题";
    elements.submitAnswersBtn.disabled = true;
    return;
  }

  elements.questionCount.textContent = `待回答问题 ${pendingQuestions.length} 个`;
  pendingQuestions.forEach((question, index) => {
    const card = document.createElement("section");
    card.className = "question-card";

    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${question.question_text}`;

    const purpose = document.createElement("p");
    purpose.className = "question-purpose";
    purpose.textContent = `目的：${question.purpose}`;

    const textarea = document.createElement("textarea");
    textarea.rows = 3;
    textarea.dataset.questionId = question.question_id;
    textarea.placeholder = question.options?.length
      ? `可参考：${question.options.join(" / ")}`
      : "请输入你的答案";

    card.append(title, purpose, textarea);
    elements.questionForm.appendChild(card);
  });

  elements.submitAnswersBtn.disabled = false;
}

function renderReport(report) {
  if (!report) {
    elements.reportPreview.textContent = "还没有报告预览。";
    return;
  }

  const lines = [];
  lines.push(`摘要：${report.summary}`);

  if (report.assumptions?.length) {
    lines.push("");
    lines.push("假设：");
    report.assumptions.forEach((item) => lines.push(`- ${item}`));
  }

  if (report.recommendations?.length) {
    lines.push("");
    lines.push("建议：");
    report.recommendations.forEach((item) => lines.push(`- ${item}`));
  }

  if (report.open_questions?.length) {
    lines.push("");
    lines.push("未决问题：");
    report.open_questions.forEach((item) => lines.push(`- ${item}`));
  }

  elements.reportPreview.textContent = lines.join("\n");
}

function renderStackList(container, title, items, formatter) {
  container.innerHTML = "";
  if (!items?.length) {
    container.textContent = `${title} 暂无内容。`;
    return;
  }

  const heading = document.createElement("h3");
  heading.className = "list-title";
  heading.textContent = title;
  container.appendChild(heading);

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "mini-card";
    card.textContent = formatter(item);
    container.appendChild(card);
  });
}

function renderSessionStep(step) {
  state.latestStep = step;
  state.sessionId = step.session_id;

  elements.sessionId.textContent = step.session_id || "-";
  elements.sessionStatus.textContent = step.status || "-";
  elements.nextAction.textContent = step.next_action || "-";
  elements.promptBox.textContent = step.prompt_to_user || "-";
  elements.refreshSessionBtn.disabled = !state.sessionId;
  elements.rawJson.textContent = JSON.stringify(step, null, 2);

  renderQuestions(step.pending_questions || []);
  renderReport(step.report_preview);
  renderStackList(
    elements.evidenceList,
    "Evidence",
    step.evidence_items || [],
    (item) => `${item.title}\n${item.summary}`
  );
  renderStackList(
    elements.conclusionList,
    "Conclusions",
    step.major_conclusions || [],
    (item) => `${item.conclusion_type}: ${item.content}`
  );
}

async function bootstrap() {
  setStatus("连接中", "pending");
  try {
    const data = await apiFetch("/api/frontend/bootstrap", { method: "GET" });
    renderBootstrap(data);
    setStatus("Cookie 已初始化", "ok");
  } catch (error) {
    setStatus("连接失败", "error");
    elements.promptBox.textContent = `初始化失败：${error.message}`;
  }
}

async function createSession() {
  const problemStatement = elements.problemInput.value.trim();
  if (problemStatement.length < 5) {
    elements.promptBox.textContent = "问题至少输入 5 个字符。";
    return;
  }

  try {
    const step = await apiFetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        mode: elements.modeSelect.value,
        problem_statement: problemStatement,
      }),
    });
    renderSessionStep(step);
    setStatus("会话已创建", "ok");
  } catch (error) {
    setStatus("创建失败", "error");
    elements.promptBox.textContent = `创建会话失败：${error.message}`;
  }
}

async function submitAnswers() {
  if (!state.sessionId) {
    elements.promptBox.textContent = "请先创建会话。";
    return;
  }

  const answers = [...elements.questionForm.querySelectorAll("textarea")]
    .map((textarea) => ({
      question_id: textarea.dataset.questionId,
      value: textarea.value.trim(),
    }))
    .filter((item) => item.value);

  if (!answers.length) {
    elements.promptBox.textContent = "至少填写一个答案后再继续。";
    return;
  }

  try {
    const step = await apiFetch(`/api/sessions/${state.sessionId}/step`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    renderSessionStep(step);

    if (step.next_action === "run_mcp" || step.next_action === "preview_report") {
      const progressed = await apiFetch(`/api/sessions/${state.sessionId}/step`, {
        method: "POST",
        body: JSON.stringify({ answers: [] }),
      });
      renderSessionStep(progressed);

      if (progressed.next_action === "preview_report") {
        const completed = await apiFetch(`/api/sessions/${state.sessionId}/step`, {
          method: "POST",
          body: JSON.stringify({ answers: [] }),
        });
        renderSessionStep(completed);
      }
    }

    setStatus("已推进会话", "ok");
  } catch (error) {
    setStatus("提交失败", "error");
    elements.promptBox.textContent = `提交答案失败：${error.message}`;
  }
}

async function refreshCurrentSession() {
  if (!state.sessionId) {
    return;
  }

  try {
    const session = await apiFetch(`/api/sessions/${state.sessionId}`, { method: "GET" });
    elements.rawJson.textContent = JSON.stringify(session, null, 2);
    elements.sessionStatus.textContent = session.status || "-";
    elements.promptBox.textContent = "已刷新当前会话详情。";
    setStatus("会话已刷新", "ok");
  } catch (error) {
    setStatus("刷新失败", "error");
    elements.promptBox.textContent = `刷新会话失败：${error.message}`;
  }
}

elements.bootstrapBtn.addEventListener("click", bootstrap);
elements.createSessionBtn.addEventListener("click", createSession);
elements.submitAnswersBtn.addEventListener("click", submitAnswers);
elements.refreshSessionBtn.addEventListener("click", refreshCurrentSession);

bootstrap();
