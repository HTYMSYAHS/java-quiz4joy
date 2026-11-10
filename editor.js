import {
  EditorView,
  keymap,
  EditorState,
  Prec,
  basicSetup,
  java,
  oneDark,
  indentUnit,
  indentWithTab,
} from "./codemirror.js";

const chrome = EditorView.theme({
  "&": { height: "100%", backgroundColor: "#10140e" },
  ".cm-scroller": { lineHeight: "1.55" },
  ".cm-content": { padding: "8px 0", caretColor: "#e0b15a" },
  ".cm-gutters": { backgroundColor: "#10140e", color: "#6e7562", border: "none" },
  ".cm-activeLine": { backgroundColor: "rgba(224, 177, 90, 0.07)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor": { borderLeftColor: "#e0b15a" },
}, { dark: true });

export function createEditor(parent, { doc = "", readOnly = false, onChange, label = "Java code" } = {}) {
  const extensions = [
    Prec.high(indentUnit.of("    ")),
    EditorState.tabSize.of(4),
    basicSetup,
    keymap.of([indentWithTab]),
    java(),
    oneDark,
    chrome,
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ spellcheck: "false", "aria-label": label }),
  ];
  if (readOnly) {
    extensions.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
  }
  if (onChange) {
    extensions.push(EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange(update.state.doc.toString());
    }));
  }
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc, extensions }),
  });
  return {
    view,
    getValue() { return view.state.doc.toString(); },
    setValue(text) {
      const next = text ?? "";
      const current = view.state.doc.toString();
      if (current === next) return;
      view.dispatch({ changes: { from: 0, to: current.length, insert: next } });
    },
    focus() { view.focus(); },
    destroy() { view.destroy(); },
  };
}

export function mountFileSet(host, tabbar, initialFiles, { onChange, label = "Java file" } = {}) {
  let files = initialFiles.map((file) => ({ name: file.name, content: file.content ?? "" }));
  let active = 0;
  const editor = createEditor(host, {
    doc: files[0]?.content || "",
    label,
    onChange(text) {
      if (!files[active]) return;
      files[active].content = text;
      onChange?.(getFiles());
    },
  });

  function getFiles() {
    return files.map((file) => ({ name: file.name, content: file.content }));
  }

  function renderTabs(extra) {
    tabbar.innerHTML = "";
    files.forEach((file, index) => {
      const tab = document.createElement("div");
      tab.className = "tab";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", index === active ? "true" : "false");
      const name = document.createElement("button");
      name.type = "button";
      name.textContent = file.name;
      name.title = "Show this file";
      name.addEventListener("click", () => open(index));
      tab.append(name);
      if (extra) extra(tab, file, index);
      tabbar.append(tab);
    });
  }

  function open(index) {
    if (index < 0 || index >= files.length) return;
    active = index;
    editor.setValue(files[active].content);
    renderTabs(tabExtra);
    onChange?.(getFiles());
  }

  let tabExtra = null;
  function setTabExtra(fn) {
    tabExtra = fn;
    renderTabs(tabExtra);
  }

  renderTabs(null);
  onChange?.(getFiles());

  return {
    getFiles,
    activeFile() { return files[active]?.name; },
    setFiles(next) {
      files = next.map((file) => ({ name: file.name, content: file.content ?? "" }));
      active = Math.min(active, Math.max(files.length - 1, 0));
      editor.setValue(files[active]?.content || "");
      renderTabs(tabExtra);
      onChange?.(getFiles());
    },
    rename(index, name) {
      if (!files[index]) return;
      files[index].name = name;
      renderTabs(tabExtra);
      onChange?.(getFiles());
    },
    open,
    setTabExtra,
    focus() { editor.focus(); },
    shown() { editor.view.requestMeasure(); },
    destroy() { editor.destroy(); },
  };
}
