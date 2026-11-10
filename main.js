import { loadBank } from "./bank.js";
import { createQuiz } from "./quiz.js";
import { createWorkspace } from "./workspace.js";
import { createGuided } from "./guided.js";
import { createAssistant } from "./ai.js";
import { ui } from "./state.js";

const bank = { questions: loadBank() };

const quiz = createQuiz({
  getBank: () => bank.questions,
  onOpenWorkspace(question) {
    showView("workspace");
    workspace.loadTask(question);
  },
});

const workspace = createWorkspace({
  getBank: () => bank.questions,
  onSubmitted({ id, ok }) {
    const recorded = quiz.recordWorkspace(ok, ok ? "passed" : "failed", id);
    if (recorded && ui.view !== "quiz") {
      const status = document.getElementById("run-status");
      if (status && !status.textContent.includes("session")) {
        status.textContent += ok ? " Counted in the quiz session." : " Counted as not yet passed in the quiz session.";
      }
    }
  },
});

const guided = createGuided();

function refreshBank() {
  bank.questions = loadBank();
  quiz.renderHealth();
  workspace.fillTasks();
}

const assistant = createAssistant({
  getBank: () => bank.questions,
  onBankChange: refreshBank,
  getHint() {
    if (ui.view === "guided") return guided.hint();
    return quiz.hint();
  },
});

function showView(name) {
  ui.view = name;
  for (const view of ["quiz", "workspace", "guided"]) {
    document.getElementById(`view-${view}`).hidden = view !== name;
    document.querySelector(`.nav-btn[data-view="${view}"]`).setAttribute("aria-current", view === name ? "page" : "false");
  }
  if (name === "quiz") {
    ui.files = [];
    quiz.shown();
  } else if (name === "workspace") {
    ui.guideTitle = "";
    workspace.shown();
  } else {
    ui.question = null;
    guided.shown();
  }
}

document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && ui.view === "workspace") {
    event.preventDefault();
    document.getElementById("run-btn").click();
  }
});

showView("quiz");
assistant.refreshStatus();
