/**
 * Google Sheets Connected Add Question Form
 */

// =========================================
// Google Apps Script URL
// =========================================
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwYlQwuaxBFajy57EYM137oXI0kiZE4_1Y181_psQXZ0R3dkkEjPAZLuJ0wSGNc16p6/exec";

// =========================================
// Revision Intervals
// =========================================
const REVISION_INTERVALS = {
  revision2: 2,
  revision5: 5,
  revision15: 15,
  revision30: 30,
  revision45: 45,
  revision60: 60
};

// =========================================
// Load Form
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addQuestionForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }
});

// =========================================
// Calculate Revision Dates
// =========================================
function calculateRevisionDates(solvedDate) {
  const baseDate = new Date(solvedDate);
  const revisionDates = {};

  for (const [key, days] of Object.entries(REVISION_INTERVALS)) {
    const revisionDate = new Date(baseDate);
    revisionDate.setDate(revisionDate.getDate() + days);
    revisionDates[key] = revisionDate.toISOString().split("T")[0];
  }

  return revisionDates;
}

// =========================================
// Handle Form Submit
// =========================================
async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : "Submit";

  if (submitBtn) {
    submitBtn.textContent = "Saving...";
    submitBtn.disabled = true;
  }

  try {
    const formData = new FormData(e.target);
    const solvedDate = formData.get("solvedDate") || new Date().toISOString().split("T")[0];
    const revisionDates = calculateRevisionDates(solvedDate);

    const questionData = {
      id: generateQuestionId(),
      title: formData.get("title"),
      link: formData.get("link"),
      difficulty: formData.get("difficulty"),
      topics: formData.get("topics"),
      approach: formData.get("approach"),
      solution: formData.get("solution"),
      notes: formData.get("notes"),
      mistakes: formData.get("mistakes"),
      timeComplexity: formData.get("timeComplexity"),
      spaceComplexity: formData.get("spaceComplexity"),
      solvedDate: solvedDate,
      dateAdded: solvedDate,
      lastRevisionDate: solvedDate,
      bookmarked: false,
      revision2: revisionDates.revision2,
      revision5: revisionDates.revision5,
      revision15: revisionDates.revision15,
      revision30: revisionDates.revision30,
      revision45: revisionDates.revision45,
      revision60: revisionDates.revision60,
      status: "Solved"
    };

    // Validation
    if (!questionData.title) {
      alert("Please enter question title");
      if (submitBtn) resetButton(submitBtn, originalText);
      return;
    }

    if (!questionData.difficulty) {
      alert("Please select difficulty");
      if (submitBtn) resetButton(submitBtn, originalText);
      return;
    }

    // Send Data
    const response = await submitToGoogleSheet(questionData);

    if (response && response.success) {
      alert("Question Saved Successfully");
      syncQuestionToLocalStorage(questionData);
      e.target.reset();
    } else {
      alert((response && response.message) || "Failed to save question");
    }

  } catch (error) {
    console.error("Connection Error details:", error);
    alert("Failed to connect Google Sheet. Check browser developer console (F12) for details.");
  } finally {
    if (submitBtn) {
      resetButton(submitBtn, originalText);
    }
  }
}

function generateQuestionId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function syncQuestionToLocalStorage(question) {
  try {
    const stored = localStorage.getItem('leetcodeQuestions')
    const questions = stored ? JSON.parse(stored) : []
    questions.push(question)
    localStorage.setItem('leetcodeQuestions', JSON.stringify(questions))
  } catch (error) {
    console.error('Failed to sync question to localStorage:', error)
  }
}

// =========================================
// Submit To Google Sheet (CORS Safe Approach)
// =========================================
async function submitToGoogleSheet(data) {
  // Using text/plain content-type allows the browser to bypass standard strict CORS pre-flights
  const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(data)
  });

  return await response.json();
}

// =========================================
// Reset Button
// =========================================
function resetButton(btn, originalText) {
  btn.textContent = originalText;
  btn.disabled = false;
}