// Java Syntax Recall – Practice & Test modes

let currentQuestion = null;
let sessionQuestions = [];
let sessionIndex = 0;
let sessionAnswers = [];
let stats = { answered: 0, correct: 0 };
let mode = "practice";

function loadStats() {
  const saved = localStorage.getItem("javaSyntaxStats");
  if (saved) stats = JSON.parse(saved);
  updateStatsDisplay();
}

function saveStats() {
  localStorage.setItem("javaSyntaxStats", JSON.stringify(stats));
}

function updateStatsDisplay() {
  document.getElementById("answered").textContent = stats.answered;
  document.getElementById("correct").textContent = stats.correct;
  const acc = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
  document.getElementById("accuracy").textContent = acc + "%";
}

function getFilteredQuestions() {
  const topic = document.getElementById("topic").value;
  if (topic === "All") return [...QUESTIONS];
  return QUESTIONS.filter(q => q.topic === topic);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startSession() {
  mode = document.getElementById("mode").value;
  const pool = getFilteredQuestions();
  if (pool.length === 0) {
    alert("No questions in this topic.");
    return;
  }
  sessionQuestions = shuffle([...pool]);
  // Limit test sessions to a reasonable number
  if (mode === "test") {
    sessionQuestions = sessionQuestions.slice(0, Math.min(15, sessionQuestions.length));
  }
  sessionIndex = 0;
  sessionAnswers = [];
  document.getElementById("sessionSummary").style.display = "none";
  document.getElementById("sessionInfo").textContent = mode === "test" ? `Test (0/${sessionQuestions.length})` : "Practice";
  showCurrent();
}

function showCurrent() {
  if (sessionIndex >= sessionQuestions.length) {
    endSession();
    return;
  }
  currentQuestion = sessionQuestions[sessionIndex];
  document.getElementById("topicBadge").textContent = currentQuestion.topic;
  document.getElementById("prompt").textContent = currentQuestion.prompt;
  document.getElementById("codeBlock").textContent = currentQuestion.code;
  document.getElementById("answerInput").value = "";
  document.getElementById("feedback").className = "feedback";
  document.getElementById("feedback").innerHTML = "";
  document.getElementById("answerInput").focus();

  if (mode === "test") {
    document.getElementById("sessionInfo").textContent = `Test (${sessionIndex + 1}/${sessionQuestions.length})`;
  }
}

function checkOrNext() {
  if (!currentQuestion) return;
  const user = document.getElementById("answerInput").value.trim();
  const correct = currentQuestion.answer.trim();
  const alts = currentQuestion.altAnswers || [];
  const isCorrect = user.toLowerCase() === correct.toLowerCase() ||
                    alts.some(a => user.toLowerCase() === a.toLowerCase());

  sessionAnswers.push({ question: currentQuestion, user, isCorrect });

  if (mode === "practice") {
    const fb = document.getElementById("feedback");
    fb.classList.add("show", isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      fb.innerHTML = `<strong>Correct!</strong><br>${currentQuestion.explanation}`;
    } else {
      fb.innerHTML = `<strong>Not quite.</strong> Expected: <code>${correct}</code><br>${currentQuestion.explanation}`;
    }
    stats.answered++;
    if (isCorrect) stats.correct++;
    saveStats();
    updateStatsDisplay();

    // Auto-advance after a short delay or on next click
    setTimeout(() => {
      sessionIndex++;
      showCurrent();
    }, 1800);
  } else {
    // Test mode: no feedback, just advance
    sessionIndex++;
    showCurrent();
  }
}

function endSession() {
  if (mode === "test") {
    let correctCount = 0;
    let html = "<strong>Test Complete</strong><br><ul style='text-align:left; margin:0.5rem 0; padding-left:1.2rem;'>";
    sessionAnswers.forEach((a, i) => {
      if (a.isCorrect) correctCount++;
      const mark = a.isCorrect ? "✓" : "✗";
      html += `<li>${mark} Q${i+1}: ${a.isCorrect ? "Correct" : "Expected " + a.question.answer}</li>`;
    });
    html += `</ul><strong>Score: ${correctCount}/${sessionAnswers.length}</strong>`;
    const summary = document.getElementById("sessionSummary");
    summary.className = "feedback show " + (correctCount / sessionAnswers.length >= 0.7 ? "correct" : "wrong");
    summary.innerHTML = html;
    summary.style.display = "block";

    stats.answered += sessionAnswers.length;
    stats.correct += correctCount;
    saveStats();
    updateStatsDisplay();
  }
  document.getElementById("sessionInfo").textContent = mode === "test" ? "Test finished" : "Practice";
  currentQuestion = null;
}

function resetStats() {
  if (confirm("Reset all progress stats?")) {
    stats = { answered: 0, correct: 0 };
    saveStats();
    updateStatsDisplay();
  }
}

// Events
document.getElementById("startSession").addEventListener("click", startSession);
document.getElementById("checkBtn").addEventListener("click", checkOrNext);
document.getElementById("resetStats").addEventListener("click", resetStats);
document.getElementById("answerInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") checkOrNext();
});

// Init
loadStats();
document.getElementById("sessionInfo").textContent = "Ready";