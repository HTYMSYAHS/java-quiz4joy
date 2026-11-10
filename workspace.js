import { mountFileSet } from "./editor.js";
import { runJava, formatRun } from "./sandbox.js";
import { stdoutHasLines } from "./question-check.js";
import { clone } from "./util.js";
import { ui } from "./state.js";

const STORE = "javaRecall.workspace";
const HELLO = [{
  name: "Main.java",
  content: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Sandbox is ready\");\n    }\n}\n",
}];

function readStore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
    if (!saved?.files?.length) return null;
    return saved;
  } catch {
    return null;
  }
}

export function createWorkspace({ getBank, onSubmitted }) {
  const tabbar = document.getElementById("tabbar");
  const select = document.getElementById("task-select");
  const output = document.getElementById("output");
  const status = document.getElementById("run-status");
  const count = document.getElementById("file-count");
  const taskCard = document.getElementById("task-card");
  const hint = document.getElementById("task-hint");
  const checkBtn = document.getElementById("check-task-btn");
  const runBtn = document.getElementById("run-btn");
  let task = null;
  let generation = 0;
  let dirty = false;

  const saved = readStore();
  const filesUi = mountFileSet(
    document.getElementById("editor-host"),
    tabbar,
    saved?.files || HELLO,
    { onChange: publish },
  );

  filesUi.setTabExtra((tab, file, index) => {
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.hidden = filesUi.getFiles().length < 2;
    close.title = `Close ${file.name}`;
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      removeFile(index);
    });
    tab.append(close);
  });

  function publish(files) {
    const current = files || filesUi.getFiles();
    ui.files = current;
    count.textContent = `${current.length} of 6 files`;
    document.getElementById("new-class").disabled = current.length >= 6;
    sessionStorage.setItem(STORE, JSON.stringify({ files: current, taskId: task?.id || null }));
    dirty = true;
  }

  function removeFile(index) {
    const files = filesUi.getFiles();
    if (files.length <= 1) return;
    files.splice(index, 1);
    filesUi.setFiles(files);
  }

  function fillTasks() {
    const current = select.value;
    const tasks = getBank().filter((question) => question.type === "workspace");
    select.innerHTML = `<option value="">Blank workspace</option>` + tasks.map((question) =>
      `<option value="${question.id}">${question.title}</option>`).join("");
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }

  function showTask(next) {
    task = next;
    taskCard.hidden = !next;
    checkBtn.hidden = !next;
    hint.hidden = true;
    if (!next) {
      document.getElementById("task-title").textContent = "";
      document.getElementById("task-prompt").textContent = "";
      ui.question = null;
      return;
    }
    document.getElementById("task-title").textContent = next.title;
    document.getElementById("task-prompt").textContent = next.prompt;
    hint.textContent = next.hint || "";
    ui.question = next;
    select.value = next.id;
  }

  function loadTask(question, { force = false } = {}) {
    if (!force && dirty && !confirm("Replace the files in the editor with this task?")) return;
    const copy = clone(question);
    filesUi.setFiles(copy.files);
    showTask(copy);
    dirty = false;
    output.textContent = "Task loaded. Run tries your driver. Check task compiles your class with the hidden grader.";
    status.textContent = "";
  }

  async function runUser() {
    const token = ++generation;
    runBtn.disabled = true;
    status.textContent = "Compiling in the sandbox…";
    const files = filesUi.getFiles();
    const result = await runJava({ files, stdin: document.getElementById("stdin").value });
    if (token !== generation) return;
    runBtn.disabled = false;
    const text = formatRun(result);
    output.textContent = text;
    ui.lastRun = text;
    const mains = files.filter((file) => /public\s+static\s+void\s+main/.test(file.content));
    const started = mains.length === 1 ? ` Started ${mains[0].name.replace(/\.java$/, "")}.` : "";
    status.textContent = result.ok ? `Finished (${result.status}).${started}` : result.status;
  }

  async function checkTask() {
    if (!task) return;
    const token = ++generation;
    const files = filesUi.getFiles();
    const notes = [];
    for (const rule of task.checks || []) {
      const file = files.find((item) => item.name === rule.file);
      let ok = false;
      try { ok = !!file && new RegExp(rule.pattern).test(file.content); } catch { ok = false; }
      if (!ok) notes.push(rule.message);
    }
    const graded = (task.gradeFiles || []).map((name) => files.find((file) => file.name === name)).filter(Boolean);
    checkBtn.disabled = true;
    runBtn.disabled = true;
    status.textContent = "Running the grader in the sandbox…";
    let result = { ok: false, status: "Not sent", stdout: "", stderr: "", compile: "" };
    if (graded.length === (task.gradeFiles || []).length) {
      result = await runJava({
        files: [...graded, ...(task.hiddenFiles || [])],
        mainClass: "Grader",
      });
    } else {
      result.compile = "A class file the grader needs is missing from the editor.";
    }
    if (token !== generation) return;
    checkBtn.disabled = false;
    runBtn.disabled = false;
    const outputOk = result.ok && stdoutHasLines(result.stdout, task.expectLines || []);
    const passed = notes.length === 0 && outputOk;
    const parts = [];
    if (notes.length) parts.push(notes.map((note) => `• ${note}`).join("\n"));
    parts.push(formatRun(result));
    if (result.ok && !outputOk) parts.push("The program ran, but it did not produce the lines the task describes.");
    const text = parts.filter(Boolean).join("\n\n");
    output.textContent = text;
    ui.lastRun = text;
    status.textContent = passed ? "Task passed." : "Not passing yet.";
    onSubmitted?.({ id: task.id, ok: passed, detail: text });
  }

  document.getElementById("add-class-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("new-class");
    const raw = input.value.trim();
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(raw)) {
      status.textContent = "Use a class name such as Student, with no .java and no spaces.";
      return;
    }
    const files = filesUi.getFiles();
    if (files.length >= 6) {
      status.textContent = "Six files is the limit: the main file plus five others.";
      return;
    }
    const name = `${raw}.java`;
    if (files.some((file) => file.name === name)) {
      status.textContent = `${name} is already open.`;
      return;
    }
    files.push({ name, content: `public class ${raw} {\n\n}\n` });
    filesUi.setFiles(files);
    filesUi.open(files.length - 1);
    input.value = "";
    status.textContent = "";
  });

  select.addEventListener("change", () => {
    if (!select.value) {
      if (dirty && !confirm("Clear the task and keep a blank Main?")) {
        select.value = task?.id || "";
        return;
      }
      filesUi.setFiles(HELLO.map((file) => ({ ...file })));
      showTask(null);
      dirty = false;
      return;
    }
    const question = getBank().find((item) => item.id === select.value);
    if (question) loadTask(question);
    else select.value = task?.id || "";
  });

  document.getElementById("run-btn").addEventListener("click", runUser);
  checkBtn.addEventListener("click", checkTask);
  document.getElementById("task-hint-btn").addEventListener("click", () => {
    hint.hidden = !hint.hidden;
  });

  if (saved?.taskId) {
    const question = getBank().find((item) => item.id === saved.taskId);
    if (question) showTask(clone(question));
  }
  fillTasks();
  dirty = Boolean(saved?.files);

  return {
    fillTasks,
    shown() {
      ui.files = filesUi.getFiles();
      filesUi.shown();
    },
    loadTask(question) { loadTask(question, { force: false }); },
    files: () => filesUi.getFiles(),
  };
}
