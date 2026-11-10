import { TOPICS, checkAll, topicCounts, answersMatch, offlineHint } from "./question-check.js";
import { loadStats, saveStats } from "./bank.js";
import { createEditor } from "./editor.js";
import { escapeHtml } from "./util.js";
import { ui } from "./state.js";

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createQuiz({ getBank, onOpenWorkspace }) {
  const topicSelect = document.getElementById("topic");
  const modeSelect = document.getElementById("mode");
  const lengthSelect = document.getElementById("length");
  const health = document.getElementById("bank-health");
  const empty = document.getElementById("quiz-empty");
  const active = document.getElementById("quiz-active");
  const snippetHost = document.getElementById("snippet-host");
  const feedback = document.getElementById("feedback");
  const summary = document.getElementById("summary");
  const answerRow = document.getElementById("answer-row");
  const workspaceActions = document.getElementById("workspace-actions");
  const answerInput = document.getElementById("answer-input");
  const checkBtn = document.getElementById("check-btn");
  const editors = [];

  let stats = loadStats();
  let queue = [];
  let index = 0;
  let answers = [];
  let phase = "idle";
  let current = null;
  let mode = "practice";
  let external = null;

  topicSelect.innerHTML = [
    `<option value="All">All topics</option>`,
    `<option value="Multi-class">Multi-class problems</option>`,
    ...TOPICS.map((topic) => `<option value="${escapeHtml(topic.id)}">${escapeHtml(topic.label)}</option>`),
  ].join("");

  function renderStats() {
    document.getElementById("answered").textContent = stats.answered;
    document.getElementById("correct").textContent = stats.correct;
    const accuracy = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
    document.getElementById("accuracy").textContent = `${accuracy}%`;
  }

  function renderHealth() {
    const bank = getBank();
    const problems = checkAll(bank);
    const counts = topicCounts(bank);
    const bits = TOPICS.map((topic) => `${counts[topic.id] || 0} ${topic.label}`).join(" · ");
    if (problems.length) {
      health.className = "health bad";
      health.textContent = `${problems.length} question(s) failed the missing-context check: ${problems.map((problem) => problem.id).join(", ")}.`;
    } else {
      health.className = "health";
      health.textContent = `${bank.length} questions pass the missing-context check. ${bits}.`;
    }
  }

  function clearEditors() {
    while (editors.length) editors.pop().destroy();
    snippetHost.innerHTML = "";
  }

  function mountCode(label, code) {
    const caption = document.createElement("p");
    caption.className = "file-label";
    caption.textContent = label;
    const host = document.createElement("div");
    host.className = "editor-pane compact";
    snippetHost.append(caption, host);
    editors.push(createEditor(host, { doc: code, readOnly: true, label }));
  }

  function showSummary(title, correctCount) {
    const items = answers.map((item, i) => {
      const mark = item.isCorrect ? "Correct" : "Missed";
      const expected = item.question.type === "workspace"
        ? item.question.title
        : item.question.answer;
      const detail = item.isCorrect ? mark : `${mark}: ${expected}`;
      return `<li>${escapeHtml(`Q${i + 1} ${detail}`)}</li>`;
    }).join("");
    summary.hidden = false;
    summary.className = `feedback ${correctCount / Math.max(answers.length, 1) >= 0.7 ? "correct" : "wrong"}`;
    summary.innerHTML = `<strong>${escapeHtml(title)}</strong><ul>${items}</ul><strong>${correctCount}/${answers.length}</strong>`;
    answerRow.hidden = true;
    workspaceActions.hidden = true;
    feedback.textContent = "";
    feedback.className = "feedback";
  }

  function finish() {
    phase = "done";
    current = null;
    ui.question = null;
    const correctCount = answers.filter((item) => item.isCorrect).length;
    if (mode === "test") {
      stats.answered += answers.length;
      stats.correct += correctCount;
      saveStats(stats);
      renderStats();
      showSummary("Test complete", correctCount);
    } else if (answers.length) {
      showSummary("Practice set complete", correctCount);
    }
    document.getElementById("session-info").textContent = mode === "test" ? "Test finished" : "Practice finished";
  }

  function showCurrent() {
    external = null;
    feedback.className = "feedback";
    feedback.textContent = "";
    summary.hidden = true;
    clearEditors();
    if (index >= queue.length) {
      finish();
      return;
    }
    current = queue[index];
    ui.question = current;
    phase = "answering";
    empty.hidden = true;
    active.hidden = false;
    const label = TOPICS.find((topic) => topic.id === current.topic)?.label || current.topic;
    document.getElementById("topic-badge").textContent = current.title ? `${label} · ${current.title}` : label;
    document.getElementById("prompt").textContent = current.prompt;
    const total = queue.length;
    document.getElementById("session-info").textContent = mode === "test"
      ? `Test ${index + 1}/${total}`
      : `Practice ${index + 1}/${total}`;

    if (current.type === "workspace") {
      answerRow.hidden = true;
      workspaceActions.hidden = false;
      current.files.forEach((file) => mountCode(file.name, file.content));
      ui.note = "This is a multi-class question. The learner should write the classes in the code page.";
    } else {
      answerRow.hidden = false;
      workspaceActions.hidden = true;
      mountCode("Snippet", current.code);
      answerInput.value = "";
      checkBtn.textContent = mode === "test" ? "Submit" : "Check";
      answerInput.focus();
      ui.note = "";
    }
  }

  function advance() {
    index += 1;
    showCurrent();
  }

  function gradeFill(user) {
    const correct = answersMatch(user, current);
    answers.push({ question: current, user, isCorrect: correct });
    if (mode === "practice") {
      stats.answered += 1;
      if (correct) stats.correct += 1;
      saveStats(stats);
      renderStats();
      feedback.className = `feedback ${correct ? "correct" : "wrong"}`;
      const expected = escapeHtml(current.answer);
      feedback.innerHTML = correct
        ? `<strong>Correct.</strong> ${escapeHtml(current.explanation)}`
        : `<strong>Not quite.</strong> Expected <code>${expected}</code>. ${escapeHtml(current.explanation)}`;
      phase = "feedback";
      checkBtn.textContent = "Next";
      ui.note = correct ? "They just answered correctly." : "They just missed this question and can see the expected answer.";
    } else {
      advance();
    }
  }

  function recordWorkspace(ok, userNote, questionId) {
    if (!current || current.type !== "workspace" || phase === "done") return false;
    if (questionId && current.id !== questionId) return false;
    if (phase === "feedback") return false;
    answers.push({ question: current, user: userNote || "", isCorrect: ok });
    external = { ok };
    if (mode === "practice") {
      stats.answered += 1;
      if (ok) stats.correct += 1;
      saveStats(stats);
      renderStats();
      feedback.className = `feedback ${ok ? "correct" : "wrong"}`;
      feedback.innerHTML = ok
        ? `<strong>The grader accepted it.</strong> ${escapeHtml(current.explanation)}`
        : `<strong>Not passing yet.</strong> ${escapeHtml(current.explanation)}`;
      phase = "feedback";
      document.getElementById("skip-task").textContent = "Next";
    } else {
      advance();
    }
    return true;
  }

  function checkOrNext() {
    if (!current || current.type === "workspace") return;
    if (phase === "feedback") {
      advance();
      return;
    }
    if (phase !== "answering") return;
    gradeFill(answerInput.value);
  }

  function skipWorkspace() {
    if (!current || current.type !== "workspace") return;
    if (phase === "feedback") {
      advance();
      return;
    }
    recordWorkspace(false, "(not submitted)");
    if (mode === "test") return;
  }

  document.getElementById("start-session").addEventListener("click", () => {
    mode = modeSelect.value;
    const topic = topicSelect.value;
    let pool = getBank();
    if (topic === "Multi-class") pool = pool.filter((question) => question.type === "workspace");
    else if (topic !== "All") pool = pool.filter((question) => question.topic === topic);
    if (!pool.length) {
      feedback.hidden = false;
      empty.hidden = true;
      active.hidden = false;
      feedback.className = "feedback wrong";
      feedback.textContent = "No questions in that topic.";
      return;
    }
    queue = shuffle(pool);
    const requested = lengthSelect.value === "all" ? queue.length : Number(lengthSelect.value);
    const cap = mode === "test" ? Math.min(requested, 15) : requested;
    queue = queue.slice(0, cap);
    index = 0;
    answers = [];
    showCurrent();
  });

  document.getElementById("reset-stats").addEventListener("click", () => {
    if (!confirm("Reset the answered and accuracy counts?")) return;
    stats = { answered: 0, correct: 0 };
    saveStats(stats);
    renderStats();
  });
  checkBtn.addEventListener("click", checkOrNext);
  answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") checkOrNext();
  });
  document.getElementById("open-task").addEventListener("click", () => {
    if (current?.type === "workspace") onOpenWorkspace(current);
  });
  document.getElementById("skip-task").addEventListener("click", skipWorkspace);

  renderStats();
  renderHealth();
  document.getElementById("session-info").textContent = "Ready";

  return {
    renderHealth,
    shown() { editors.forEach((editor) => editor.view.requestMeasure()); },
    recordWorkspace,
    current() { return current; },
    hint() { return current ? offlineHint(current) : "Start a session, or open a guided build, and ask again."; },
  };
}
