import { QUESTIONS } from "./questions.js";
import { clone } from "./util.js";

const BANK_KEY = "javaRecall.bank";
const UNDO_KEY = "javaRecall.bankUndo";
const STATS_KEY = "javaSyntaxStats";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function builtinQuestions() {
  return QUESTIONS.map((question) => clone(question));
}

export function hasCustomBank() {
  return localStorage.getItem(BANK_KEY) != null;
}

export function loadBank() {
  const stored = readJson(BANK_KEY, null);
  if (!Array.isArray(stored) || stored.length === 0) return builtinQuestions();
  return stored;
}

function readUndo() {
  const stack = readJson(UNDO_KEY, []);
  return Array.isArray(stack) ? stack : [];
}

export function undoCount() {
  return readUndo().length;
}

function pushUndo(snapshot) {
  const stack = readUndo();
  stack.push(snapshot);
  while (stack.length > 10) stack.shift();
  localStorage.setItem(UNDO_KEY, JSON.stringify(stack));
}

export function saveBank(questions) {
  pushUndo(loadBank());
  localStorage.setItem(BANK_KEY, JSON.stringify(questions));
}

export function applyQuestion(question) {
  const bank = loadBank();
  const index = bank.findIndex((item) => item.id === question.id);
  const next = bank.slice();
  if (index >= 0) next[index] = question;
  else next.push(question);
  saveBank(next);
  return { replaced: index >= 0, bank: next };
}

export function undoBank() {
  const stack = readUndo();
  const previous = stack.pop();
  if (!previous) return null;
  localStorage.setItem(UNDO_KEY, JSON.stringify(stack));
  localStorage.setItem(BANK_KEY, JSON.stringify(previous));
  return previous;
}

export function restoreBuiltin() {
  pushUndo(loadBank());
  localStorage.removeItem(BANK_KEY);
  return loadBank();
}

export function loadStats() {
  const saved = readJson(STATS_KEY, null);
  if (!saved || typeof saved.answered !== "number") return { answered: 0, correct: 0 };
  return { answered: saved.answered, correct: saved.correct || 0 };
}

export function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify({
    answered: stats.answered,
    correct: stats.correct,
  }));
}
