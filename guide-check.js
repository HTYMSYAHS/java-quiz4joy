// Declarative checks for Guided Build steps. The same function is used in the
// browser and by `npm run check-questions` against reference solutions.

export function evaluateRules(rules, files) {
  const messages = [];
  for (const rule of rules || []) {
    const file = (files || []).find((item) => item.name === rule.file);
    const text = file ? file.content : "";
    if (!file) {
      messages.push(rule.message || `Missing ${rule.file}.`);
      continue;
    }
    let ok = false;
    try {
      ok = new RegExp(rule.pattern).test(text);
    } catch {
      messages.push(`Could not read a check (${rule.message || rule.file}).`);
      continue;
    }
    if (!ok) messages.push(rule.message || `Update ${rule.file}.`);
  }
  return { ok: messages.length === 0, messages };
}

export function rulesThrough(guide, stepIndex) {
  const rules = [];
  const last = Math.min(stepIndex, guide.steps.length - 1);
  for (let i = 0; i <= last; i += 1) rules.push(...(guide.steps[i].rules || []));
  return rules;
}
