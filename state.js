// Shared view context for the tutor. Modules write it; nothing here imports them.
export const ui = {
  view: "quiz",
  question: null,
  files: [],
  guideTitle: "",
  stepTitle: "",
  stepInstructions: "",
  lastRun: "",
  note: "",
};
