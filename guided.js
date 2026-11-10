import { GUIDES } from "./guides.js";
import { rulesThrough, evaluateRules } from "./guide-check.js";
import { mountFileSet } from "./editor.js";
import { runJava, formatRun } from "./sandbox.js";
import { ui } from "./state.js";

const STORE = "javaRecall.guides";

function loadStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORE, JSON.stringify(store));
}

function linesOf(stdout) {
  return String(stdout || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function createGuided() {
  const list = document.getElementById("guide-list");
  const idle = document.getElementById("guide-idle");
  const active = document.getElementById("guide-active");
  const stepList = document.getElementById("step-list");
  const hint = document.getElementById("step-hint");
  const status = document.getElementById("guide-status");
  const output = document.getElementById("guide-output");
  const checkBtn = document.getElementById("check-step");
  let guide = null;
  let stepIndex = 0;
  let unlocked = 0;
  let filesUi = null;
  let editorReady = false;
  let store = loadStore();

  list.innerHTML = "";
  for (const item of GUIDES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guide-card";
    button.dataset.guide = item.id;
    button.innerHTML = `<strong></strong><span></span>`;
    button.querySelector("strong").textContent = item.title;
    button.querySelector("span").textContent = item.level;
    button.addEventListener("click", () => openGuide(item.id));
    list.append(button);
  }

  function persist(passed) {
    if (!guide || !editorReady) return;
    const files = passed || filesUi.getFiles();
    store[guide.id] = { step: stepIndex, unlocked, files };
    saveStore(store);
    ui.files = files;
  }

  function ensureEditor(files) {
    if (!filesUi) {
      filesUi = mountFileSet(document.getElementById("guide-editor"), document.getElementById("guide-tabs"), files, {
        onChange: (next) => persist(next),
      });
      editorReady = true;
      persist(filesUi.getFiles());
      return;
    }
    filesUi.setFiles(files);
  }

  function renderSteps() {
    stepList.innerHTML = "";
    guide.steps.forEach((step, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${index + 1}. ${step.title}`;
      button.disabled = index > unlocked;
      if (index === stepIndex) button.setAttribute("aria-current", "step");
      button.addEventListener("click", () => {
        if (index <= unlocked) showStep(index);
      });
      item.append(button);
      stepList.append(item);
    });
    document.querySelectorAll(".guide-card").forEach((card) => {
      card.classList.toggle("current", card.dataset.guide === guide.id);
    });
  }

  function showStep(index) {
    stepIndex = index;
    const step = guide.steps[index];
    document.getElementById("step-title").textContent = `Step ${index + 1} of ${guide.steps.length}: ${step.title}`;
    document.getElementById("step-instructions").textContent = step.instructions;
    hint.hidden = true;
    hint.textContent = step.hint;
    document.getElementById("show-hint").textContent = "Show hint";
    output.hidden = true;
    status.textContent = index < unlocked ? "This step already passed. Later steps are open." : "The check looks at this step and everything before it.";
    ui.guideTitle = guide.title;
    ui.stepTitle = step.title;
    ui.stepInstructions = step.instructions;
    const fileIndex = filesUi.getFiles().findIndex((file) => file.name === step.file);
    if (fileIndex >= 0) filesUi.open(fileIndex);
    renderSteps();
    persist();
  }

  function openGuide(id, { reset = false } = {}) {
    guide = GUIDES.find((item) => item.id === id);
    if (!guide) return;
    idle.hidden = true;
    active.hidden = false;
    const saved = !reset && store[id];
    unlocked = saved ? Math.min(saved.unlocked || 0, guide.steps.length) : 0;
    const start = saved ? Math.min(saved.step || 0, unlocked) : 0;
    ensureEditor(saved?.files?.length ? saved.files : guide.starters);
    document.getElementById("guide-level").textContent = guide.level;
    document.getElementById("guide-title").textContent = guide.title;
    showStep(start);
    filesUi.shown();
  }

  async function checkStep() {
    if (!guide || !filesUi) return;
    const step = guide.steps[stepIndex];
    const files = filesUi.getFiles();
    const rules = rulesThrough(guide, stepIndex);
    const local = evaluateRules(rules, files);
    if (!local.ok) {
      status.textContent = "Not yet.";
      output.hidden = false;
      output.textContent = local.messages.map((message) => `• ${message}`).join("\n");
      ui.lastRun = output.textContent;
      return;
    }
    if (!step.run) {
      passStep("Step passed.");
      return;
    }
    checkBtn.disabled = true;
    status.textContent = "Checking the program in the sandbox…";
    output.hidden = false;
    try {
      for (const [caseIndex, item] of step.run.cases.entries()) {
        const result = await runJava({ files, stdin: item.stdin || "" });
        const actual = linesOf(result.stdout);
        const expected = item.includes;
        const matched = result.ok && expected.every((line) => actual.includes(line));
        if (!matched) {
          const input = item.stdin ? `Input was: ${item.stdin.trim()}\n` : "";
          output.textContent = `${input}Case ${caseIndex + 1} did not pass.\n\n${formatRun(result)}`;
          status.textContent = result.ok ? "The program ran, but the output did not match this step." : result.status;
          ui.lastRun = output.textContent;
          return;
        }
      }
      output.textContent = "Sandbox output matched this step.";
      passStep("Step passed, including the sandbox run.");
    } finally {
      checkBtn.disabled = false;
    }
  }

  function passStep(message) {
    unlocked = Math.max(unlocked, stepIndex + 1);
    status.textContent = message;
    ui.lastRun = output.hidden ? "" : output.textContent;
    if (stepIndex < guide.steps.length - 1) showStep(stepIndex + 1);
    else {
      status.textContent = `${message} That is the end of ${guide.title}.`;
      renderSteps();
      persist();
    }
  }

  document.getElementById("show-hint").addEventListener("click", () => {
    hint.hidden = !hint.hidden;
    document.getElementById("show-hint").textContent = hint.hidden ? "Show hint" : "Hide hint";
  });
  checkBtn.addEventListener("click", checkStep);
  document.getElementById("guide-reset").addEventListener("click", () => {
    if (!guide) return;
    if (!confirm("Throw away your progress on this build and restore the starter files?")) return;
    delete store[guide.id];
    saveStore(store);
    openGuide(guide.id, { reset: true });
  });

  return {
    shown() {
      if (filesUi) {
        ui.files = filesUi.getFiles();
        filesUi.shown();
      }
    },
    hint() {
      return guide ? guide.steps[stepIndex].hint : "Choose a guided build first.";
    },
  };
}
