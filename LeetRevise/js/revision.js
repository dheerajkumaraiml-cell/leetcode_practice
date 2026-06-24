/**
 * Revision Page Handler
 * Displays questions due for revision today
 */

// Configuration
const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/d/{YOUR_DEPLOYMENT_ID}/usercallback";
const SHEET_URL_PLACEHOLDER = /\{YOUR_DEPLOYMENT_ID\}|usercallback/i;

let revisionQuestions = [];
let currentIndex = 0;
let completedToday = 0;
let questionActions = []; // Track actions for batch update

document.addEventListener('DOMContentLoaded', () => {
  // Record session start time
  sessionStorage.setItem('revisionStartTime', new Date().getTime());
  
  initializeRevision();
});

// Save data before leaving page
window.addEventListener('beforeunload', () => {
  // Save any pending actions
  if (questionActions.length > 0) {
    localStorage.setItem('pendingRevisionActions', JSON.stringify(questionActions));
  }
});

/**
 * Initialize the revision session
 */
async function initializeRevision() {
  try {
    // Set today's date
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    document.getElementById('revisionDate').textContent = `Today: ${dateStr}`;

    // Load questions due for revision today
    await loadTodaysRevisions();

    // Update stats
    updateStats();

    // Display first question or empty state
    if (revisionQuestions.length === 0) {
      showEmptyState();
    } else {
      displayNextQuestion();
    }

  } catch (error) {
    console.error('Error initializing revision:', error);
    showError('Failed to load revision questions');
  }
}

/**
 * Load questions due for revision today
 */
async function loadTodaysRevisions() {
  try {
    const questions = await getStoredOrSheetQuestions();

    const today = new Date().toISOString().split('T')[0];
    revisionQuestions = questions.filter(q => {
      return [q.revision2, q.revision5, q.revision15, q.revision30, q.revision45, q.revision60]
        .some(date => normalizeDate(date) === today);
    });

    console.log(`Loaded ${revisionQuestions.length} questions for revision today`);

  } catch (error) {
    console.error('Error loading revisions:', error);
    revisionQuestions = [];
  }
}

async function getStoredOrSheetQuestions() {
  let localQuestions = [];
  const stored = localStorage.getItem('leetcodeQuestions');

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        localQuestions = parsed;
      }
    } catch (error) {
      console.error('Error parsing localStorage questions:', error);
    }
  }

  if (!SHEET_URL_PLACEHOLDER.test(GOOGLE_SHEET_API_URL)) {
    const sheetQuestions = await fetchQuestionsFromSheet();
    if (Array.isArray(sheetQuestions) && sheetQuestions.length > 0) {
      return sheetQuestions;
    }
  }

  if (localQuestions.length > 0) {
    return localQuestions;
  }

  const sample = generateSampleQuestions();
  localStorage.setItem('leetcodeQuestions', JSON.stringify(sample));
  return sample;
}

async function fetchQuestionsFromSheet() {
  try {
    if (SHEET_URL_PLACEHOLDER.test(GOOGLE_SHEET_API_URL)) {
      return [];
    }

    const url = `${GOOGLE_SHEET_API_URL}?action=getQuestions`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('Sheet fetch responded with', response.status);
      return [];
    }

    const payload = await response.json();
    if (payload && payload.success && payload.data && Array.isArray(payload.data.questions)) {
      return payload.data.questions;
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch questions from Google Sheet:', error);
    return [];
  }
}

function normalizeDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue + 'T00:00:00');
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().split('T')[0];
}

/**
 * Generate sample questions for demo
 */
function generateSampleQuestions() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  return [
    {
      title: 'Two Sum',
      link: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'Easy',
      topics: 'Array, Hash Map',
      approach: 'Use hash map to store values and check complements',
      solution: 'Two-pass approach with hash map',
      notes: 'Watch for duplicate values',
      mistakes: 'Initially tried nested loop',
      solvedDate: today.toISOString().split('T')[0],
      revision2: tomorrowStr,
      status: 'Solved'
    },
    {
      title: 'Add Two Numbers',
      link: 'https://leetcode.com/problems/add-two-numbers/',
      difficulty: 'Medium',
      topics: 'Linked List, Math',
      approach: 'Traverse both lists, handle carry',
      solution: 'Simulate addition with carry propagation',
      notes: 'Reverse order stored in linked lists',
      mistakes: 'Forgot to handle carry at end',
      solvedDate: today.toISOString().split('T')[0],
      revision2: tomorrowStr,
      status: 'Solved'
    }
  ];
}

/**
 * Update statistics display
 */
function updateStats() {
  document.getElementById('totalCount').textContent = revisionQuestions.length;
  document.getElementById('remainingCount').textContent = 
    Math.max(0, revisionQuestions.length - currentIndex);
  document.getElementById('completedCount').textContent = completedToday;
}

/**
 * Display the next question
 */
function displayNextQuestion() {
  if (currentIndex >= revisionQuestions.length) {
    showCompletedState();
    return;
  }

  const question = revisionQuestions[currentIndex];
  const container = document.getElementById('revisionContainer');

  const card = document.createElement('div');
  card.className = 'question-card revision-review-card';
  card.innerHTML = `
    <div class="card-header">
      <div>
        <h3 class="card-title">${escapeHtml(question.title)}</h3>
        <p class="muted">Focus on concept recall before reviewing code.</p>
      </div>
      <span class="difficulty-badge difficulty-${question.difficulty.toLowerCase()}">
        ${question.difficulty}
      </span>
    </div>

    <div class="card-body">
      ${question.topics ? `
        <div class="card-section">
          <span class="section-label">Topics</span>
          <div class="topics-list">
            ${question.topics.split(',').map(topic => 
              `<span class="topic-tag">${escapeHtml(topic.trim())}</span>`
            ).join('')}
          </div>
        </div>
      ` : ''}

      <div class="card-section">
        <span class="section-label">Next Step</span>
        <div class="section-content">
          <p>Review your problem knowledge before viewing notes or code.</p>
          <ul class="revision-step-list">
            <li>1. Read the title, difficulty, and topics.</li>
            <li>2. Open notes to recall the approach.</li>
            <li>3. Reveal mistakes, then compare to solution.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card-footer">
      <div class="btn-group">
        <button class="action-btn btn-review" onclick="window.location.href='notes.html?id=${encodeURIComponent(question.id)}'">
          📖 View Notes
        </button>
        <button class="action-btn btn-easy" onclick="handleEasy()">
          ✓ Mark Reviewed
        </button>
        <button class="action-btn btn-difficult" onclick="handleDifficult()">
          ⚠ Still Difficult
        </button>
        <button class="action-btn btn-skip" onclick="handleSkip()">
          ⊘ Skip
        </button>
      </div>

      <div class="card-progress">
        <span>${currentIndex + 1} / ${revisionQuestions.length}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${((currentIndex + 1) / revisionQuestions.length) * 100}%"></div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = '';
  container.appendChild(card);
}

/**
 * Open review in new tab
 */
function openReview(link) {
  if (link && link !== 'undefined') {
    window.open(link, '_blank');
  } else {
    showPopup('Info', 'No link provided for this question', 'info');
  }
}

/**
 * Handle "Easy" button - mark as reviewed, continue schedule
 */
async function handleEasy() {
  const question = revisionQuestions[currentIndex];
  
  try {
    // Update local data
    const stored = localStorage.getItem('leetcodeQuestions');
    if (stored) {
      const questions = JSON.parse(stored);
      const index = questions.findIndex(q => q.title === question.title);
      if (index !== -1) {
        questions[index].reviewStatus = 'easy';
        questions[index].lastReviewedDate = new Date().toISOString().split('T')[0];
        questions[index].reviewCount = (questions[index].reviewCount || 0) + 1;
        localStorage.setItem('leetcodeQuestions', JSON.stringify(questions));
      }
    }

    // Track action
    questionActions.push({
      title: question.title,
      action: 'easy',
      date: new Date().toISOString(),
      message: 'Question marked as easy - normal revision schedule continues'
    });

    // Send update to Google Sheet
    await updateGoogleSheet(question, 'easy');

    completeQuestion('easy');
    moveToNext();

    showPopup('Success!', `"${question.title}" marked as easy. Next revision on schedule.`, 'success');
  } catch (error) {
    console.error('Error marking as easy:', error);
    showPopup('Error', 'Failed to update. Continuing anyway.', 'error');
    completeQuestion('easy');
    moveToNext();
  }
}

/**
 * Handle "Still Difficult" button - create new revision in 2 days
 */
async function handleDifficult() {
  const question = revisionQuestions[currentIndex];
  
  try {
    // Calculate new revision date (2 days from now)
    const today = new Date();
    const newRevisionDate = new Date(today);
    newRevisionDate.setDate(newRevisionDate.getDate() + 2);
    const newRevisionDateStr = newRevisionDate.toISOString().split('T')[0];

    // Update local data
    const stored = localStorage.getItem('leetcodeQuestions');
    if (stored) {
      const questions = JSON.parse(stored);
      const index = questions.findIndex(q => q.title === question.title);
      if (index !== -1) {
        questions[index].reviewStatus = 'difficult';
        questions[index].lastReviewedDate = new Date().toISOString().split('T')[0];
        questions[index].reviewCount = (questions[index].reviewCount || 0) + 1;
        
        // Add new revision date if not already present
        questions[index].additionalRevisions = questions[index].additionalRevisions || [];
        questions[index].additionalRevisions.push({
          date: newRevisionDateStr,
          reason: 'Still difficult - extra practice needed'
        });

        localStorage.setItem('leetcodeQuestions', JSON.stringify(questions));
      }
    }

    // Track action
    questionActions.push({
      title: question.title,
      action: 'difficult',
      date: new Date().toISOString(),
      newRevisionDate: newRevisionDateStr,
      message: 'Question marked as difficult - new revision scheduled in 2 days'
    });

    // Send update to Google Sheet
    await updateGoogleSheet(question, 'difficult', newRevisionDateStr);

    completeQuestion('difficult');
    moveToNext();

    showPopup('Success!', `"${question.title}" scheduled for revision on ${formatDateForDisplay(newRevisionDateStr)}.`, 'success');
  } catch (error) {
    console.error('Error marking as difficult:', error);
    showPopup('Error', 'Failed to update. Continuing anyway.', 'error');
    completeQuestion('difficult');
    moveToNext();
  }
}

/**
 * Handle "Skip" button - move to tomorrow
 */
async function handleSkip() {
  const question = revisionQuestions[currentIndex];
  
  try {
    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Update local data - shift all revision dates to tomorrow
    const stored = localStorage.getItem('leetcodeQuestions');
    if (stored) {
      const questions = JSON.parse(stored);
      const index = questions.findIndex(q => q.title === question.title);
      if (index !== -1) {
        questions[index].reviewStatus = 'skipped';
        questions[index].lastSkippedDate = new Date().toISOString().split('T')[0];

        // Shift all revision dates forward by 1 day
        const revisionFields = ['revision2', 'revision5', 'revision15', 'revision30', 'revision45', 'revision60'];
        revisionFields.forEach(field => {
          if (questions[index][field]) {
            const date = new Date(questions[index][field] + 'T00:00:00');
            date.setDate(date.getDate() + 1);
            questions[index][field] = date.toISOString().split('T')[0];
          }
        });

        localStorage.setItem('leetcodeQuestions', JSON.stringify(questions));
      }
    }

    // Track action
    questionActions.push({
      title: question.title,
      action: 'skip',
      date: new Date().toISOString(),
      newRevisionDate: tomorrowStr,
      message: 'Question skipped - all revisions moved to tomorrow'
    });

    // Send update to Google Sheet
    await updateGoogleSheet(question, 'skip', tomorrowStr);

    completeQuestion('skipped');
    moveToNext();

    showPopup('Skipped', `"${question.title}" moved to tomorrow.`, 'info');
  } catch (error) {
    console.error('Error skipping question:', error);
    showPopup('Error', 'Failed to update. Continuing anyway.', 'error');
    completeQuestion('skipped');
    moveToNext();
  }
}

/**
 * Mark question as completed and save status
 */
function completeQuestion(status) {
  const question = revisionQuestions[currentIndex];
  
  // Update local storage with completion status
  const stored = localStorage.getItem('leetcodeQuestions');
  if (stored) {
    const questions = JSON.parse(stored);
    const index = questions.findIndex(q => q.title === question.title);
    if (index !== -1) {
      questions[index].reviewStatus = status;
      questions[index].lastReviewedDate = new Date().toISOString().split('T')[0];
      localStorage.setItem('leetcodeQuestions', JSON.stringify(questions));
    }
  }

  completedToday++;
  console.log(`Question marked as ${status}:`, question.title);
}

/**
 * Update Google Sheet with revision action
 * @param {object} question - Question object
 * @param {string} action - Action type: 'easy', 'difficult', or 'skip'
 * @param {string} newRevisionDate - New revision date (for difficult/skip actions)
 */
async function updateGoogleSheet(question, action, newRevisionDate = null) {
  try {
    // Prepare update data
    const updateData = {
      type: 'updateRevisionAction',
      title: question.title,
      action: action,
      actionDate: new Date().toISOString(),
      newRevisionDate: newRevisionDate,
      timestamp: new Date().toISOString()
    };

    // Send to Google Apps Script
    const response = await fetch(GOOGLE_SHEET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Google Sheet updated:', result);
    return result;

  } catch (error) {
    console.error('Error updating Google Sheet:', error);
    // Continue even if update fails - data is saved locally
    return { success: false, error: error.message };
  }
}

/**
 * Move to next question
 */
function moveToNext() {
  currentIndex++;
  updateStats();

  // Show animation and display next
  const container = document.getElementById('revisionContainer');
  container.style.opacity = '0';
  
  setTimeout(() => {
    displayNextQuestion();
    container.style.opacity = '1';
  }, 200);
}

/**
 * Show empty state
 */
function showEmptyState() {
  document.getElementById('emptyState').classList.remove('hidden');
  document.getElementById('revisionContainer').innerHTML = '';
}

/**
 * Show completed state
 */
function showCompletedState() {
  document.getElementById('completedState').classList.remove('hidden');
  document.getElementById('revisionContainer').innerHTML = '';
  
  // Save session summary to localStorage
  saveRevisionSession();
}

/**
 * Save revision session summary
 */
function saveRevisionSession() {
  try {
    const sessionSummary = {
      date: new Date().toISOString().split('T')[0],
      completedAt: new Date().toISOString(),
      totalRevised: completedToday,
      totalDue: revisionQuestions.length,
      actions: questionActions,
      duration: calculateSessionDuration()
    };

    // Save to localStorage
    const sessions = JSON.parse(localStorage.getItem('revisionSessions') || '[]');
    sessions.push(sessionSummary);
    localStorage.setItem('revisionSessions', JSON.stringify(sessions));

    // Send summary to Google Sheet
    sendRevisionSummary(sessionSummary);

    console.log('Revision session saved:', sessionSummary);
  } catch (error) {
    console.error('Error saving revision session:', error);
  }
}

/**
 * Calculate session duration
 */
function calculateSessionDuration() {
  const startTime = sessionStorage.getItem('revisionStartTime') || new Date().getTime();
  const endTime = new Date().getTime();
  const durationMs = endTime - startTime;
  const durationMinutes = Math.round(durationMs / 60000);
  return durationMinutes;
}

/**
 * Send revision session summary to Google Sheet
 */
async function sendRevisionSummary(summary) {
  try {
    const response = await fetch(GOOGLE_SHEET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'revisionSessionSummary',
        date: summary.date,
        completedAt: summary.completedAt,
        totalRevised: summary.totalRevised,
        totalDue: summary.totalDue,
        duration: summary.duration,
        actionsCount: summary.actions.length
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Revision summary sent to Google Sheet:', result);
    }
  } catch (error) {
    console.error('Error sending revision summary:', error);
  }
}

/**
 * Show error message
 */
function showError(message) {
  const container = document.getElementById('revisionContainer');
  container.innerHTML = `
    <div style="padding: 40px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <h3>${escapeHtml(message)}</h3>
      <a href="index.html" class="btn btn-primary" style="margin-top: 16px;">Back Home</a>
    </div>
  `;
}

/**
 * Show popup notification
 */
function showPopup(title, message, type = 'info') {
  const popup = document.createElement('div');
  popup.className = `popup popup-${type}`;
  popup.innerHTML = `
    <div class="popup-content">
      <div class="popup-header">
        <span class="popup-title">${escapeHtml(title)}</span>
        <button class="popup-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="popup-message">${escapeHtml(message)}</div>
      <div class="popup-footer">
        <button class="popup-btn" onclick="this.parentElement.parentElement.remove()">OK</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  setTimeout(() => {
    if (popup.parentElement) {
      popup.remove();
    }
  }, 4000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Add smooth transitions
const style = document.createElement('style');
style.textContent = `
  #revisionContainer {
    transition: opacity 0.2s ease;
  }
`;
document.head.appendChild(style);

