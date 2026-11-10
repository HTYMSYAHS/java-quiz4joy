import { CORE_QUESTIONS } from "./bank-core.js";
import { LATER_QUESTIONS } from "./bank-later.js";
import { WORKSPACE_QUESTIONS } from "./bank-workspace.js";

export const QUESTIONS = [
  ...CORE_QUESTIONS,
  ...LATER_QUESTIONS,
  ...WORKSPACE_QUESTIONS,
];
