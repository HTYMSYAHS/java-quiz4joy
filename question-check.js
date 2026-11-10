// Missing-context check shared by the Node script, the quiz, and the AI helper.
//
// A question fails when the expected answer depends on a user-defined name
// (variable, field, parameter, method, or class) that is not written in that
// question's own prompt or code. Java keywords and the introductory JDK names
// below are syntax and API recall, not missing context. The same rule is what
// `npm run check-questions` runs.

export const BLANK = "________";

export const JAVA_KEYWORDS = new Set([
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
  "class", "const", "continue", "default", "do", "double", "else", "enum",
  "extends", "final", "finally", "float", "for", "goto", "if", "implements",
  "import", "instanceof", "int", "interface", "long", "native", "new",
  "package", "private", "protected", "public", "return", "short", "static",
  "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
  "transient", "try", "void", "volatile", "while", "true", "false", "null",
  "var",
]);

// Names a first-year Java course expects students to recall from the standard
// library. Course-specific fields and methods (computeAvg, yr1, setLength, …)
// are deliberately not listed.
export const JDK_NAMES = new Set([
  "String", "System", "Math", "Scanner", "Integer", "Double", "Character",
  "Boolean", "JOptionPane", "StringBuffer", "StringBuilder", "Object",
  "Exception", "out", "in", "err", "args",
  "nextInt", "nextDouble", "nextLine", "next", "nextBoolean", "hasNext",
  "hasNextInt", "hasNextLine", "close", "println", "print", "printf",
  "showMessageDialog", "showInputDialog",
  "length", "charAt", "equals", "equalsIgnoreCase", "toUpperCase", "toLowerCase",
  "append", "toString", "startsWith", "endsWith", "substring", "replace",
  "trim", "indexOf", "isEmpty", "contains", "compareTo", "valueOf", "format",
  "parseInt", "parseDouble", "parseBoolean",
  "random", "round", "abs", "sqrt", "pow", "max", "min", "floor", "ceil",
  "main", "isLetter", "isDigit", "isUpperCase", "isLowerCase", "isWhitespace",
]);

export const TOPICS = [
  { id: "Basics", label: "Basics & Scanner" },
  { id: "Selection", label: "Selection & Validation" },
  { id: "Loops", label: "Loops" },
  { id: "Strings", label: "Strings & Chars" },
  { id: "Arrays", label: "1D Arrays" },
  { id: "2D Arrays", label: "2D Arrays" },
  { id: "Methods", label: "Methods" },
  { id: "Instantiable Classes", label: "Instantiable Classes" },
  { id: "Mixed", label: "Mixed / Full Pattern" },
];

const FILL_TYPES = new Set(["fill", "snippet"]);

export function extractIdentifiers(text) {
  if (!text) return [];
  return String(text).match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [];
}

export function isUserDefined(name) {
  return !JAVA_KEYWORDS.has(name) && !JDK_NAMES.has(name);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function appears(haystack, name) {
  if (!haystack || !name) return false;
  return new RegExp(`\\b${escapeRegExp(name)}\\b`).test(haystack);
}

export function questionContext(question) {
  const parts = [question.prompt || "", question.code || ""];
  for (const file of question.files || []) {
    parts.push(file.name || "", file.content || "");
  }
  return parts.join("\n");
}

export function answerForms(question) {
  const forms = [];
  if (question.answer != null && String(question.answer).length) forms.push(String(question.answer));
  if (Array.isArray(question.altAnswers)) {
    for (const alt of question.altAnswers) forms.push(String(alt));
  }
  return forms;
}

export function checkQuestion(question) {
  const errors = [];
  if (!question || typeof question !== "object") return ["Question is not an object."];
  if (!question.id) errors.push("Missing id.");
  if (!question.topic) errors.push("Missing topic.");
  if (!question.prompt || !String(question.prompt).trim()) errors.push("Missing prompt.");
  if (!question.type) errors.push("Missing type.");

  const forms = answerForms(question);
  if (FILL_TYPES.has(question.type)) {
    if (!forms.length) errors.push("Missing answer.");
    if (!question.code || !String(question.code).includes(BLANK)) {
      errors.push(`Fill-in code must include the blank ${BLANK}.`);
    }
    if (!question.explanation) errors.push("Missing explanation.");
  }

  if (question.type === "workspace") {
    if (!Array.isArray(question.files) || question.files.length < 2) {
      errors.push("A multi-class question needs at least two files.");
    }
    if (question.files && question.files.length > 6) {
      errors.push("A multi-class question can start with at most 6 files.");
    }
    if (!Array.isArray(question.api) || question.api.length === 0) {
      errors.push("A multi-class question needs an api list of the names it depends on.");
    }
    if (!Array.isArray(question.expectLines) || question.expectLines.length === 0) {
      errors.push("A multi-class question needs expectLines for the grader.");
    }
    if (!Array.isArray(question.hiddenFiles) || question.hiddenFiles.length === 0) {
      errors.push("A multi-class question needs a hidden grader.");
    }
    if (!question.explanation) errors.push("Missing explanation.");
    const prompt = question.prompt || "";
    const hidden = (question.hiddenFiles || []).map((file) => file.content || "").join("\n");
    const api = new Set(question.api || []);
    for (const name of api) {
      if (!appears(prompt, name)) errors.push(`API name "${name}" is not written in the prompt.`);
    }
    const used = new Set();
    for (const match of hidden.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)) used.add(match[1]);
    for (const match of hidden.matchAll(/\bnew\s+([A-Za-z_$][A-Za-z0-9_$]*)/g)) used.add(match[1]);
    for (const name of used) {
      if (!isUserDefined(name) || name === "Grader") continue;
      if (!api.has(name)) errors.push(`Grader uses "${name}" but it is not in the api list.`);
      if (!appears(prompt, name)) errors.push(`Grader uses "${name}" but the prompt never names it.`);
    }
    for (const file of question.files || []) {
      const className = String(file.name || "").replace(/\.java$/, "");
      if (className && !appears(prompt, className)) {
        errors.push(`Class ${className} is not named in the prompt.`);
      }
    }
  }

  const context = questionContext(question);
  for (const form of forms) {
    for (const id of extractIdentifiers(form)) {
      if (!isUserDefined(id)) continue;
      if (!appears(context, id)) {
        errors.push(`Answer identifier "${id}" does not appear in the prompt or code.`);
      }
    }
  }
  return errors;
}

export function checkAll(questions) {
  const seen = new Set();
  const problems = [];
  for (const question of questions) {
    const errors = [];
    if (question?.id && seen.has(question.id)) errors.push(`Duplicate id ${question.id}.`);
    if (question?.id) seen.add(question.id);
    errors.push(...checkQuestion(question));
    if (errors.length) problems.push({ id: question?.id || "(missing id)", errors });
  }
  return problems;
}

export function topicCounts(questions) {
  const counts = {};
  for (const question of questions) counts[question.topic] = (counts[question.topic] || 0) + 1;
  return counts;
}

export function fillBlank(code, answer) {
  const source = String(code || "");
  if (!source.includes(BLANK)) return source;
  return source.replace(BLANK, answer ?? "");
}

export function normaliseAnswer(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function answersMatch(user, question) {
  const given = normaliseAnswer(user);
  if (!given) return false;
  return answerForms(question).some((form) => normaliseAnswer(form) === given);
}

export function offlineHint(question) {
  if (question?.hint) return question.hint;
  if (question?.type === "workspace") {
    return "Build the classes named in the prompt. Every field and method the grader calls is written there. Use private fields and this when a parameter shadows a field.";
  }
  const answer = String(question?.answer ?? "").trim();
  const notes = ["Every custom name you need is already written in the prompt or the snippet."];
  if (JAVA_KEYWORDS.has(answer)) notes.push(`The blank is a Java keyword, ${answer.length} letters long.`);
  else if (JDK_NAMES.has(answer)) notes.push("The blank is a standard-library name. Look at the type of the receiver before the dot.");
  else if (answer) notes.push(`The answer is ${answer.length} characters long, ignoring nothing you would type.`);
  return notes.join(" ");
}

export function stdoutHasLines(stdout, expectedLines) {
  const pool = String(stdout || "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length);
  for (const expected of expectedLines) {
    const index = pool.indexOf(expected);
    if (index < 0) return false;
    pool.splice(index, 1);
  }
  return true;
}
