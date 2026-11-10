import { QUESTIONS } from "../questions.js";
import { GUIDES } from "../guides.js";
import { GUIDE_SOLUTIONS } from "./guide-solutions.js";
import {
  checkAll,
  checkQuestion,
  topicCounts,
  TOPICS,
} from "../question-check.js";
import { evaluateRules } from "../guide-check.js";

const problems = checkAll(QUESTIONS);
const counts = topicCounts(QUESTIONS);
const required = [
  "Basics", "Selection", "Loops", "Strings", "Arrays", "2D Arrays",
  "Methods", "Instantiable Classes",
];

let failed = false;

console.log("Question bank");
for (const topic of TOPICS) {
  const count = counts[topic.id] || 0;
  console.log(`  ${topic.label.padEnd(28)} ${String(count).padStart(3)}  (${topic.id})`);
}
const known = new Set(TOPICS.map((topic) => topic.id));
for (const topic of Object.keys(counts)) {
  if (!known.has(topic)) console.log(`  ${topic.padEnd(28)} ${String(counts[topic]).padStart(3)}  (not in TOPICS)`);
}
console.log(`  ${"Total".padEnd(28)} ${String(QUESTIONS.length).padStart(3)}`);

const multi = QUESTIONS.filter((question) => question.type === "workspace");
console.log(`\nMulti-class workspace questions: ${multi.length}`);

for (const topic of required) {
  if ((counts[topic] || 0) < 5) {
    console.error(`Need at least 5 questions in ${topic}, found ${counts[topic] || 0}.`);
    failed = true;
  }
}
if (multi.length < 5) {
  console.error(`Need at least 5 multi-class questions, found ${multi.length}.`);
  failed = true;
}

if (problems.length) {
  failed = true;
  console.error(`\n${problems.length} question(s) failed the missing-context check:`);
  for (const problem of problems) {
    console.error(`\n${problem.id}`);
    for (const error of problem.errors) console.error(`  - ${error}`);
  }
} else {
  console.log("\nMissing-context check: every question passed.");
}

const fixture = {
  id: "fixture-missing",
  topic: "Instantiable Classes",
  type: "fill",
  prompt: "Call the compute method.",
  code: "student.________();",
  answer: "computeAvg",
  explanation: "The old bank expected a name the snippet never showed.",
};
const fixtureErrors = checkQuestion(fixture);
if (!fixtureErrors.some((error) => error.includes("computeAvg"))) {
  console.error("Self-test failed: the checker did not flag computeAvg.");
  failed = true;
} else {
  console.log("Self-test: a missing name (computeAvg) was flagged.");
}

const allowed = checkQuestion({
  id: "fixture-jdk",
  topic: "Basics",
  type: "fill",
  prompt: "Read an integer.",
  code: "int age = sc.________();",
  answer: "nextInt",
  explanation: "Standard library recall is allowed.",
});
if (allowed.length) {
  console.error("Self-test failed: nextInt should not be treated as missing context.");
  console.error(allowed);
  failed = true;
} else {
  console.log("Self-test: a JDK name (nextInt) was accepted.");
}

const shown = checkQuestion({
  id: "fixture-shown",
  topic: "Instantiable Classes",
  type: "fill",
  prompt: "Use the fields yr1 and yr2.",
  code: "public class Student {\n    private double yr1;\n    private double yr2;\n    private double avg;\n    public void computeAvg() { avg = ________; }\n}",
  answer: "(yr1 + yr2) / 2",
  explanation: "Both fields are on the class.",
});
if (shown.length) {
  console.error("Self-test failed: yr1 and yr2 are written in the snippet.");
  console.error(shown);
  failed = true;
} else {
  console.log("Self-test: names that appear in the snippet were accepted.");
}

console.log("\nGuided builds");
for (const guide of GUIDES) {
  const solution = GUIDE_SOLUTIONS[guide.id];
  if (!solution) {
    console.error(`  ${guide.id}: no reference solution`);
    failed = true;
    continue;
  }
  if (!guide.steps?.length) {
    console.error(`  ${guide.id}: no steps`);
    failed = true;
    continue;
  }
  for (const step of guide.steps) {
    if (!step.instructions || !step.hint || !step.rules?.length) {
      console.error(`  ${guide.id} / ${step.title}: a step needs instructions, a hint, and rules.`);
      failed = true;
    }
  }
  const rules = guide.steps.flatMap((step) => step.rules || []);
  const result = evaluateRules(rules, solution);
  if (!result.ok) {
    failed = true;
    console.error(`  ${guide.id}: reference solution failed`);
    for (const message of result.messages) console.error(`    - ${message}`);
  } else {
    console.log(`  ${guide.id}: ${guide.steps.length} steps, reference solution matches`);
  }
}

if (failed) process.exit(1);
console.log("\nAll checks passed.");
