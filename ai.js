import { checkQuestion, fillBlank, BLANK, offlineHint } from "./question-check.js";
import { runJava, formatRun, explainCompilerText, preflightJava } from "./sandbox.js";
import { applyQuestion, undoBank, undoCount, restoreBuiltin, loadBank } from "./bank.js";
import { createEditor } from "./editor.js";
import { escapeHtml } from "./util.js";
import { ui } from "./state.js";

const SETTINGS_KEY = "javaRecall.ai";

const PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    needsBaseUrl: false,
    note: "A key from Google AI Studio works from the browser. It is sent only to Google, as the request key.",
  },
  {
    id: "openai",
    label: "OpenAI-compatible",
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    needsBaseUrl: true,
    note: "Any chat-completions URL that allows browser calls. OpenAI and OpenRouter both answer from the browser. If a host blocks the page, set the base URL to https://openrouter.ai/api/v1.",
  },
];

const SYSTEM = `You are a lab tutor for a first-year Introduction to Programming course in Java.
Topics: Scanner, selection and validation, loops, strings and characters, one- and two-dimensional arrays, methods, and instantiable classes.
Instantiable classes use private fields, constructors with this, setters, a compute method, getters, toString, and a separate driver class. The usual order is set, then compute, then get.

When asked for a hint, give one nudge and do not give the full answer.
When asked to explain an error, explain the compiler or logic message in plain language and show the smallest change.
When asked to review code, talk like a lab tutor: first whether it matches the task, then whether fields are private and this is used when a parameter hides a field.

When asked to draft or edit a question, reply with one json object and no other text, in this shape:
{
  "action": "add",
  "question": {
    "id": "short-unique-id",
    "topic": "Basics",
    "type": "fill",
    "prompt": "what to do",
    "code": "a snippet containing ${BLANK}",
    "answer": "the missing text",
    "altAnswers": [],
    "explanation": "why",
    "hint": "a nudge that does not state the full answer"
  },
  "test": {
    "files": [{"name": "Main.java", "content": "a complete default-package program"}],
    "stdin": "",
    "expectOutputIncludes": "OK"
  }
}
Topic must be one of: Basics, Selection, Loops, Strings, Arrays, 2D Arrays, Methods, Instantiable Classes, Mixed.
The blank is eight underscores. Every user-defined name in the answer must already appear in the prompt or the code. Java keywords and standard-library names such as nextInt, println, String, length, and parseInt do not have to be repeated. Do not invent a field or method name in the answer. The test program must compile and print the expected text. The app will reject the draft otherwise.`;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (saved && typeof saved === "object") return saved;
  } catch { /* keep the defaults */ }
  return {};
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

async function geminiComplete({ apiKey, model, messages }) {
  const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const contents = messages.filter((message) => message.role !== "system").map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: { temperature: 0.3 },
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Gemini returned ${response.status}`);
  const text = (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("");
  if (!text.trim()) throw new Error(data.candidates?.[0]?.finishReason || "Gemini returned an empty reply.");
  return text;
}

async function openaiComplete({ apiKey, model, baseUrl, messages }) {
  const root = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${root}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, temperature: 0.3, messages }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `The provider returned ${response.status}`);
  const text = data.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error("The provider returned an empty reply.");
  return text;
}

function extractJson(text) {
  const fenced = String(text).match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : String(text);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); }
  catch { return null; }
}

function buildTest(proposal) {
  const test = proposal.test;
  if (test?.files?.length) {
    const expect = test.expectOutputIncludes == null
      ? []
      : (Array.isArray(test.expectOutputIncludes) ? test.expectOutputIncludes : [test.expectOutputIncludes]);
    return { files: test.files, stdin: test.stdin || "", expect: expect.map(String) };
  }
  const question = proposal.question;
  if (question.type === "workspace") return null;
  const filled = fillBlank(question.code || "", question.answer || "");
  if (filled.includes(BLANK)) return null;
  const classMatch = filled.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (classMatch) {
    if (!/public\s+static\s+void\s+main/.test(filled)) return null;
    return { files: [{ name: `${classMatch[1]}.java`, content: filled }], stdin: "", expect: [] };
  }
  const body = filled.split("\n").map((line) => `        ${line}`).join("\n");
  return {
    files: [{ name: "Main.java", content: `public class Main {\n    public static void main(String[] args) {\n${body}\n    }\n}\n` }],
    stdin: "",
    expect: [],
  };
}

function contextBlock(getBank) {
  const lines = [`The learner is on the ${ui.view} page.`];
  if (ui.question) {
    lines.push(`Question ${ui.question.id} (${ui.question.topic}, ${ui.question.type}).`);
    lines.push(ui.question.prompt || "");
    if (ui.question.code) lines.push(`Snippet:\n${ui.question.code}`);
    lines.push("Do not quote the stored answer unless they use Show answer.");
  }
  if (ui.guideTitle) lines.push(`Guided build: ${ui.guideTitle} / ${ui.stepTitle}\n${ui.stepInstructions}`);
  if (ui.files?.length) {
    lines.push(ui.files.map((file) => `--- ${file.name}\n${file.content}`).join("\n"));
  }
  if (ui.lastRun) lines.push(`Latest sandbox or check output:\n${ui.lastRun}`);
  if (ui.note) lines.push(ui.note);
  const ids = getBank().map((question) => question.id).join(", ");
  lines.push(`Existing question ids: ${ids}`);
  return lines.join("\n\n");
}

export function createAssistant({ getBank, onBankChange, getHint }) {
  const panel = document.getElementById("ai-panel");
  const log = document.getElementById("ai-log");
  const status = document.getElementById("ai-status");
  const proposalEl = document.getElementById("proposal");
  const providerSelect = document.getElementById("ai-provider");
  const dialog = document.getElementById("settings-dialog");
  let settings = { provider: "gemini", model: "", apiKey: "", baseUrl: "", ...loadSettings() };
  let history = [];
  let proposal = null;
  let previewEditor = null;
  let busy = false;

  providerSelect.innerHTML = PROVIDERS.map((provider) => `<option value="${provider.id}">${provider.label}</option>`).join("");

  function provider() {
    return PROVIDERS.find((item) => item.id === settings.provider) || PROVIDERS[0];
  }

  function refreshStatus() {
    const hasKey = Boolean(settings.apiKey);
    status.textContent = hasKey ? `${provider().label} · ${settings.model || provider().defaultModel}` : "Offline hints — no API key saved";
    const undo = document.getElementById("ai-undo");
    undo.hidden = undoCount() === 0;
  }

  function syncForm() {
    providerSelect.value = settings.provider || "gemini";
    const current = provider();
    document.getElementById("ai-model").value = settings.model || current.defaultModel;
    document.getElementById("ai-base").value = settings.baseUrl || current.defaultBaseUrl || "";
    document.getElementById("ai-key").value = settings.apiKey || "";
    document.getElementById("base-label").hidden = !current.needsBaseUrl;
    document.getElementById("ai-provider-note").textContent = current.note;
  }

  function addBubble(role, text) {
    const bubble = document.createElement("div");
    bubble.className = `bubble ${role === "user" ? "user" : "assistant"}`;
    const parts = String(text).split(/```(\w*)\n([\s\S]*?)```/g);
    for (let i = 0; i < parts.length; i += 1) {
      if (i % 3 === 0) {
        if (!parts[i]) continue;
        const span = document.createElement("div");
        span.textContent = parts[i];
        bubble.append(span);
      } else if (i % 3 === 1) {
        const host = document.createElement("div");
        host.className = "editor-pane compact";
        bubble.append(host);
        createEditor(host, { doc: parts[i + 1] || "", readOnly: true, label: "Tutor code" });
        i += 1;
      }
    }
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
  }

  function clearPreview() {
    if (previewEditor) previewEditor.destroy();
    previewEditor = null;
    proposalEl.hidden = true;
    proposalEl.innerHTML = "";
    proposal = null;
  }

  function renderProposal(draft, validation) {
    clearPreview();
    proposal = { ...draft, validation };
    proposalEl.hidden = false;
    const question = draft.question;
    const ready = validation.ready;
    const existing = loadBank().some((item) => item.id === question.id);
    proposalEl.innerHTML = `
      <h3>Preview — not in the bank</h3>
      <p class="${ready ? "proposal-ok" : "proposal-bad"}">${ready ? "Check passed and the test run succeeded. Nothing is saved until you apply it." : "Refused. This draft will not be added."}</p>
      <p></p>
      <div class="editor-pane compact" id="proposal-code"></div>
      <p class="muted"></p>
      <pre class="output"></pre>
      <div class="button-row">
        <button type="button" class="primary" id="apply-draft" ${ready ? "" : "disabled"}>Apply</button>
        <button type="button" id="discard-draft">Discard</button>
      </div>`;
    proposalEl.querySelector("h3").insertAdjacentHTML("afterend", "");
    const paragraphs = proposalEl.querySelectorAll("p");
    paragraphs[1].textContent = `${existing ? "Replaces" : "Adds"} ${question.id} · ${question.topic}`;
    const codeHost = proposalEl.querySelector("#proposal-code");
    if (question.code) {
      previewEditor = createEditor(codeHost, { doc: question.code, readOnly: true, label: "Draft snippet" });
    } else {
      codeHost.remove();
    }
    const answerLine = proposalEl.querySelector("p.muted");
    if (question.answer) answerLine.textContent = `Answer: ${question.answer}`;
    else answerLine.remove();
    const errors = [...(validation.errors || [])];
    const runText = validation.run ? formatRun(validation.run) : "";
    proposalEl.querySelector("pre").textContent = [errors.join("\n"), runText].filter(Boolean).join("\n\n");
    proposalEl.querySelector("#apply-draft").addEventListener("click", () => {
      if (!proposal?.validation?.ready) return;
      const again = checkQuestion(proposal.question);
      if (again.length) {
        addBubble("assistant", `Refused. The missing-context check failed:\n${again.join("\n")}`);
        return;
      }
      const result = applyQuestion(proposal.question);
      onBankChange();
      addBubble("assistant", `${result.replaced ? "Replaced" : "Added"} ${proposal.question.id}. Use Undo to put the bank back.`);
      clearPreview();
      refreshStatus();
    });
    proposalEl.querySelector("#discard-draft").addEventListener("click", () => {
      clearPreview();
      addBubble("assistant", "Draft discarded. The bank is unchanged.");
    });
  }

  async function validateDraft(parsed, sourceLabel) {
    const question = parsed?.question && typeof parsed.question === "object" ? parsed.question : null;
    if (!question) {
      addBubble("assistant", "That text did not contain a question object, so nothing was checked.");
      return;
    }
    if (!question.type) question.type = "fill";
    const draft = {
      action: parsed.action === "replace" ? "replace" : "add",
      question,
      test: parsed.test || null,
    };
    const errors = checkQuestion(question);
    if (errors.length) {
      renderProposal(draft, { ready: false, errors, run: null });
      addBubble("assistant", `Refused ${sourceLabel}. The missing-context check failed, so it was not tested or added.\n${errors.join("\n")}`);
      return;
    }
    const plan = buildTest(draft);
    if (!plan) {
      renderProposal(draft, {
        ready: false,
        errors: ["The draft needs test.files: a complete program the sandbox can compile."],
        run: null,
      });
      addBubble("assistant", "Refused. There is no runnable test, so the draft was not added.");
      return;
    }
    addBubble("assistant", "The name check passed. Running the draft's test in the sandbox…");
    const run = await runJava({ files: plan.files, stdin: plan.stdin || "" });
    const outputOk = run.ok && plan.expect.every((piece) => String(run.stdout).includes(piece));
    const validation = {
      ready: outputOk,
      errors: outputOk ? [] : [run.ok ? "The test ran, but the output missed the expected text." : "The test program did not run."],
      run,
    };
    renderProposal(draft, validation);
    addBubble("assistant", validation.ready
      ? "The test run succeeded. Apply it if you want it in the bank. Undo stays available afterwards."
      : "Refused. The sandbox test did not pass, so the draft was not added.");
  }

  function offlineReply(kind) {
    if (kind === "hint") return getHint();
    if (kind === "explain") {
      if (!ui.lastRun) return "There is no compiler output yet. Run the code, or check a guided step, then ask again.";
      const notes = explainCompilerText(ui.lastRun);
      return `${notes.join(" ")}`.trim() || ui.lastRun;
    }
    if (kind === "review") {
      const notes = preflightJava(ui.files || []);
      const head = notes.length ? notes.join(" ") : "The files are named in a way the sandbox can compile.";
      return `${head} Add an API key in Settings for a tutor's review of the logic.`;
    }
    if (kind === "reveal") {
      const question = ui.question;
      if (!question) return "Open a question first.";
      if (question.type === "workspace") return question.explanation;
      return `Answer: ${question.answer}\n${question.explanation}`;
    }
    return "Drafting a question needs an API key. You can still paste JSON under “Validate a draft” and the same missing-context check will run.";
  }

  async function ask(text, { kind = "chat", expectDraft = false } = {}) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    addBubble("user", trimmed);
    history.push({ role: "user", content: trimmed });
    if (!settings.apiKey) {
      const reply = offlineReply(kind);
      history.push({ role: "assistant", content: reply });
      addBubble("assistant", reply);
      return;
    }
    busy = true;
    document.getElementById("ai-send").disabled = true;
    status.textContent = "Thinking…";
    try {
      let prior = history.slice(-8, -1);
      while (prior.length && prior[0].role !== "user") prior = prior.slice(1);
      const messages = [
        { role: "system", content: SYSTEM },
        ...prior,
        { role: "user", content: `${contextBlock(getBank)}\n\n${trimmed}` },
      ];
      const current = provider();
      const reply = current.id === "gemini"
        ? await geminiComplete({ apiKey: settings.apiKey, model: settings.model || current.defaultModel, messages })
        : await openaiComplete({
          apiKey: settings.apiKey,
          model: settings.model || current.defaultModel,
          baseUrl: settings.baseUrl || current.defaultBaseUrl,
          messages,
        });
      history.push({ role: "assistant", content: reply });
      addBubble("assistant", reply);
      if (expectDraft) {
        const parsed = extractJson(reply);
        if (!parsed) addBubble("assistant", "The reply did not include a question JSON, so nothing was added.");
        else await validateDraft(parsed, "the generated draft");
      }
    } catch (error) {
      const fallback = offlineReply(kind);
      addBubble("assistant", `The provider could not answer (${error.message}). Offline note:\n${fallback}`);
    } finally {
      busy = false;
      document.getElementById("ai-send").disabled = false;
      refreshStatus();
    }
  }

  function openPanel() {
    panel.hidden = false;
    if (!log.childElementCount) {
      addBubble("assistant", "I can hint the question you are on, explain a compiler message, or review the classes in the code page. Without an API key I stay on the built-in hints and the missing-context check. A drafted question is not added until you press Apply.");
    }
    refreshStatus();
  }

  document.getElementById("open-ai").addEventListener("click", openPanel);
  document.getElementById("ai-close").addEventListener("click", () => { panel.hidden = true; });
  document.getElementById("ai-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("ai-input");
    const text = input.value;
    input.value = "";
    ask(text);
  });
  document.querySelectorAll("[data-ai]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.ai;
      const prompts = {
        hint: "Give one hint for what I am working on. Do not state the full answer.",
        explain: "Explain the latest error in plain language for a first-year student.",
        review: "Review my current Java files against the task I am on.",
        reveal: "Show the answer.",
        draft: "Draft one new fill-in question on the same topic as the current page. Include the test program.",
      };
      if (kind === "reveal" || (!settings.apiKey && kind !== "draft")) {
        addBubble("user", prompts[kind]);
        addBubble("assistant", offlineReply(kind));
        return;
      }
      ask(prompts[kind], { kind, expectDraft: kind === "draft" });
    });
  });
  document.getElementById("draft-validate").addEventListener("click", () => {
    const parsed = extractJson(document.getElementById("draft-json").value);
    if (!parsed) {
      addBubble("assistant", "Could not read that as JSON.");
      return;
    }
    validateDraft(parsed, "the pasted draft");
  });
  document.getElementById("ai-undo").addEventListener("click", () => {
    const previous = undoBank();
    if (!previous) return;
    onBankChange();
    refreshStatus();
    addBubble("assistant", "Restored the previous question bank.");
    clearPreview();
  });
  document.getElementById("ai-settings-open").addEventListener("click", () => {
    syncForm();
    dialog.showModal();
  });
  providerSelect.addEventListener("change", () => {
    settings.provider = providerSelect.value;
    const current = provider();
    if (!document.getElementById("ai-model").value) document.getElementById("ai-model").value = current.defaultModel;
    document.getElementById("base-label").hidden = !current.needsBaseUrl;
    document.getElementById("ai-provider-note").textContent = current.note;
    if (!settings.baseUrl && current.defaultBaseUrl) document.getElementById("ai-base").value = current.defaultBaseUrl;
  });
  document.getElementById("settings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    settings = {
      provider: providerSelect.value,
      model: document.getElementById("ai-model").value.trim(),
      baseUrl: document.getElementById("ai-base").value.trim(),
      apiKey: document.getElementById("ai-key").value.trim(),
    };
    saveSettings(settings);
    refreshStatus();
    dialog.close();
    addBubble("assistant", settings.apiKey ? "Key saved in this browser only." : "No key stored. Offline hints stay available.");
  });
  document.getElementById("ai-clear").addEventListener("click", () => {
    settings.apiKey = "";
    saveSettings(settings);
    document.getElementById("ai-key").value = "";
    refreshStatus();
  });
  document.getElementById("settings-close").addEventListener("click", () => dialog.close());
  document.getElementById("restore-bank").addEventListener("click", () => {
    if (!confirm("Replace the saved bank with the original questions? You can undo this.")) return;
    restoreBuiltin();
    onBankChange();
    refreshStatus();
    addBubble("assistant", "The original bank is back. Undo will return the edited one.");
  });

  refreshStatus();
  return { refreshStatus, openPanel };
}
