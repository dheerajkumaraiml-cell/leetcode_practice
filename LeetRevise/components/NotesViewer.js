const STORAGE_KEY = 'leetcodeQuestions';
const REVISION_INTERVALS = [2, 5, 15, 30, 45, 60];
const CONFIDENCE_OPTIONS = [
  { value: 'forgot', label: '😵 Forgot Completely' },
  { value: 'partial', label: '😕 Partial Recall' },
  { value: 'mostly', label: '🙂 Mostly Remembered' },
  { value: 'perfect', label: '😎 Perfect Recall' }
];
const WEAKNESS_CATEGORIES = [
  { key: 'edge-case', label: 'Edge Cases', regex: /edge\s*case|boundary|corner/i },
  { key: 'off-by-one', label: 'Off-by-One Errors', regex: /off[-\s]?by[-\s]?one/i },
  { key: 'dp', label: 'DP State Mistakes', regex: /dp|dynamic programming|state transition/i },
  { key: 'graph', label: 'Graph Traversal Errors', regex: /graph|dfs|bfs|cycle/i },
  { key: 'recursion', label: 'Recursion Errors', regex: /recursive|recursion|stack overflow/i },
  { key: 'complexity', label: 'Time Complexity Issues', regex: /time complexity|performance|slow|n\s*log|quadratic|exponential/i }
];

let state = {
  question: null,
  editing: false,
  revisionStep: 1,
  confidence: null,
  activeSection: null
};

export function initializeNotesViewer() {
  const root = document.getElementById('notesRoot');
  if (!root) return;

  const questionId = new URLSearchParams(window.location.search).get('id');
  const question = loadQuestion(questionId);
  if (!question) {
    root.innerHTML = `<div class="page-empty"><h2>Question Not Found</h2><p>The question could not be loaded. Return to <a href="all-questions.html">All Questions</a>.</p></div>`;
    return;
  }

  state.question = question;
  state.activeSection = 'highlights';
  state.revisionStep = 1;
  state.confidence = question.confidence || null;
  question.highlights = Array.isArray(question.highlights) ? question.highlights : [];
  question.confidenceHistory = Array.isArray(question.confidenceHistory) ? question.confidenceHistory : [];
  question.weakAreas = Array.isArray(question.weakAreas) ? question.weakAreas : [];

  renderPage(root);
  attachListeners(root);
  refreshDerivedState();
}

function loadQuestion(id) {
  if (!id) return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const questions = JSON.parse(stored);
    return questions.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Failed to parse stored questions', error);
    return null;
  }
}

function saveQuestion(question) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const questions = stored ? JSON.parse(stored) : [];
    const index = questions.findIndex(item => item.id === question.id);
    if (index !== -1) {
      questions[index] = question;
    } else {
      questions.push(question);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch (error) {
    console.error('Unable to save question', error);
  }
}

function renderPage(root) {
  const question = state.question;
  const topics = question.topics ? question.topics.split(',').map(tag => tag.trim()).filter(Boolean) : [];
  const tagsHtml = topics.map(tag => `<span class="tag-pill small">${escapeHtml(tag)}</span>`).join('');
  const highlightHtml = question.highlights.length ? question.highlights.map(item => `
      <div class="highlight-pill highlight-${item.type}"><strong>${escapeHtml(item.category)}:</strong> ${escapeHtml(item.text)}</div>
    `).join('') : '<p class="muted">No highlights yet. Add your key insights or edge cases to keep concepts front and center.</p>';
  const timelineHtml = renderTimeline(question);
  const flashcardsHtml = buildFlashcards(question).map(card => `
      <div class="flashcard">
        <div class="flashcard-question">Q: ${escapeHtml(card.question)}</div>
        <div class="flashcard-answer">A: ${escapeHtml(card.answer)}</div>
      </div>
    `).join('');
  const weakAreaHtml = renderWeakAreas(question);

  root.innerHTML = `
    <section class="page-header notes-header">
      <div>
        <h2>Notes & Revision</h2>
        <p class="subtitle">A focused learning card for ${escapeHtml(question.title)}</p>
      </div>
      <div class="header-actions">
        <a href="all-questions.html" class="btn btn-outline">Back to Library</a>
        <a href="solution.html?id=${encodeURIComponent(question.id)}" class="btn btn-primary">Open Solution</a>
      </div>
    </section>

    <section class="notes-grid">
      <aside class="notes-sidebar">
        <div class="info-card">
          <div class="info-row">
            <span class="label">Problem</span>
            <strong>${escapeHtml(question.title)}</strong>
          </div>
          <div class="info-row">
            <span class="label">Difficulty</span>
            <span class="badge difficulty-${question.difficulty?.toLowerCase() || 'medium'}">${escapeHtml(question.difficulty)}</span>
          </div>
          <div class="info-row">
            <span class="label">Topics</span>
            <div class="tag-list">${tagsHtml || '<span class="muted">None</span>'}</div>
          </div>
          <div class="info-row">
            <span class="label">Date Added</span>
            <span>${escapeHtml(question.dateAdded || question.solvedDate || 'Unknown')}</span>
          </div>
          <div class="info-row">
            <span class="label">Last Revision</span>
            <span>${escapeHtml(question.lastRevisionDate || 'Not revised yet')}</span>
          </div>
          <div class="info-row">
            <span class="label">Next Revision</span>
            <span>${escapeHtml(getNextRevision(question) || 'No upcoming revision')}</span>
          </div>
        </div>

        <div class="info-card highlight-card">
          <div class="info-card-header">
            <h3>Highlights</h3>
            <button class="icon-btn small" data-action="add-highlight">＋</button>
          </div>
          <div class="highlights-list">${highlightHtml}</div>
        </div>

        <div class="info-card flashcard-panel">
          <div class="info-card-header">
            <h3>Flashcards</h3>
            <button class="icon-btn small" data-action="refresh-flashcards">↻</button>
          </div>
          <div class="flashcards-list">${flashcardsHtml || '<p class="muted">Flashcards are generated automatically from your notes.</p>'}</div>
        </div>

        <div class="info-card weakness-panel">
          <h3>Weak Areas</h3>
          <div class="weakness-list">${weakAreaHtml}</div>
        </div>
      </aside>

      <div class="notes-main">
        <div class="revision-card card">
          <div class="revision-status-row">
            <div>
              <span class="label">Revision Mode</span>
              <h3>Step ${state.revisionStep} of 6</h3>
            </div>
            <button class="btn btn-primary" data-action="next-step">${getRevisionButtonLabel()}</button>
          </div>
          ${renderRevisionStep(question)}
        </div>

        <div class="card collapsible" data-section="approach">
          <div class="card-header collapsible-header">
            <div>
              <h3>🎯 Approach</h3>
              <p class="muted">Main idea, data structure, algorithm, and optimization logic.</p>
            </div>
            <button class="icon-btn" data-action="toggle-section">▾</button>
          </div>
          <div class="collapsible-body">
            <div class="section-row">
              <span class="sub-label">Main Idea</span>
              <p>${escapeHtml(question.approach || 'No approach saved yet.')}</p>
            </div>
          </div>
        </div>

        <div class="card collapsible" data-section="complexity">
          <div class="card-header collapsible-header">
            <div>
              <h3>⚡ Complexity</h3>
              <p class="muted">Time and space complexity badges.</p>
            </div>
            <button class="icon-btn" data-action="toggle-section">▾</button>
          </div>
          <div class="collapsible-body complexity-grid">
            <div class="complexity-chip">Time: <strong>${escapeHtml(question.timeComplexity || 'Not set')}</strong></div>
            <div class="complexity-chip">Space: <strong>${escapeHtml(question.spaceComplexity || 'Not set')}</strong></div>
          </div>
        </div>

        <div class="card collapsible" data-section="notes">
          <div class="card-header collapsible-header">
            <div>
              <h3>💡 Important Notes</h3>
              <p class="muted">Key observations, edge cases, concepts, and interview tricks.</p>
            </div>
            <button class="icon-btn" data-action="toggle-section">▾</button>
          </div>
          <div class="collapsible-body">
            <div class="content-editor" data-editor="notes">
              <p>${escapeHtml(question.notes || 'No notes yet.')}</p>
            </div>
            <div class="editor-actions">
              <button class="btn btn-outline" data-action="edit-section" data-section="notes">Edit Notes</button>
            </div>
          </div>
        </div>

        <div class="card collapsible" data-section="mistakes">
          <div class="card-header collapsible-header">
            <div>
              <h3>❌ Mistakes & Lessons</h3>
              <p class="muted">Bugs, wrong approaches, and lessons learned.</p>
            </div>
            <button class="icon-btn" data-action="toggle-section">▾</button>
          </div>
          <div class="collapsible-body">
            <div class="content-editor" data-editor="mistakes">
              <p>${escapeHtml(question.mistakes || 'No mistakes logged yet.')}</p>
            </div>
            <div class="editor-actions">
              <button class="btn btn-outline" data-action="edit-section" data-section="mistakes">Edit Mistakes</button>
            </div>
          </div>
        </div>

        <div class="card collapsible" data-section="timeline">
          <div class="card-header collapsible-header">
            <div>
              <h3>🕒 Revision Timeline</h3>
              <p class="muted">Solved date, revision milestones, and the next scheduled review.</p>
            </div>
            <button class="icon-btn" data-action="toggle-section">▾</button>
          </div>
          <div class="collapsible-body timeline-body">
            ${timelineHtml}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTimeline(question) {
  const items = [
    { label: 'Solved', date: question.solvedDate || question.dateAdded || 'Unknown' },
    { label: 'Revision #1', date: question.revision2 || '—' },
    { label: 'Revision #2', date: question.revision5 || '—' },
    { label: 'Revision #3', date: question.revision15 || '—' },
    { label: 'Revision #4', date: question.revision30 || '—' },
    { label: 'Revision #5', date: question.revision45 || '—' },
    { label: 'Revision #6', date: question.revision60 || '—' }
  ];

  const nodes = items.map(item => `
    <div class="timeline-item">
      <span class="timeline-dot"></span>
      <div>
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.date)}</p>
      </div>
    </div>
  `);

  const totalCount = REVISION_INTERVALS.filter(key => question[`revision${key}`]).length + 1;
  const lastRevision = question.lastRevisionDate || question.dateAdded || '—';
  const nextRevision = getNextRevision(question) || '—';

  return `
    <div class="timeline-summary">
      <div><strong>Total Revisions</strong><span>${totalCount}</span></div>
      <div><strong>Last Revision</strong><span>${escapeHtml(lastRevision)}</span></div>
      <div><strong>Next Revision</strong><span>${escapeHtml(nextRevision)}</span></div>
    </div>
    <div class="timeline-list">${nodes.join('')}</div>
  `;
}

function buildFlashcards(question) {
  const cards = [];
  if (question.notes) {
    cards.push({ question: 'What is the most important insight for this problem?', answer: extractFirstSentence(question.notes) });
    cards.push({ question: 'What edge cases should you remember?', answer: extractMatch(question.notes, /edge case[s]?[^.?!]*/i) || 'Review the note section for edge case details.' });
  }
  if (question.approach) {
    cards.push({ question: 'What is the main algorithm used?', answer: extractMatch(question.approach, /(\w+\s*algorithm|greedy|dp|dynamic programming|binary search|two pointers|hash map)/i) || 'Review the approach section.' });
    cards.push({ question: 'Why is this approach chosen?', answer: extractFirstSentence(question.approach) });
  }
  if (question.mistakes) {
    cards.push({ question: 'What mistake should you avoid next time?', answer: extractFirstSentence(question.mistakes) });
  }
  return cards.filter(card => card.answer);
}

function renderWeakAreas(question) {
  const text = [question.notes, question.mistakes, question.approach].join(' ');
  const detected = WEAKNESS_CATEGORIES.filter(category => category.regex.test(text)).map(category => category.label);
  question.weakAreas = detected.length ? detected : question.weakAreas || [];
  saveQuestion(question);

  if (!question.weakAreas.length) {
    return '<p class="muted">No weak areas identified yet. Add more reflections to get smarter weakness tracking.</p>';
  }
  return question.weakAreas.map(area => `<span class="weakness-chip">${escapeHtml(area)}</span>`).join('');
}

function renderRevisionStep(question) {
  const link = question.link ? `<a href="${escapeHtml(question.link)}" target="_blank" rel="noreferrer">Open Problem</a>` : '<span class="muted">No link available</span>';
  const stepContent = {
    1: `
      <div class="revision-step">
        <p class="muted">Review the problem details and try to recall the approach without reading notes.</p>
        <div class="step-badge">${escapeHtml(question.difficulty)}</div>
        <div class="step-details">
          <div><strong>Title</strong><p>${escapeHtml(question.title)}</p></div>
          <div><strong>Topics</strong><p>${escapeHtml(question.topics || '—')}</p></div>
          <div><strong>Link</strong><p>${link}</p></div>
        </div>
      </div>
    `,
    2: `
      <div class="revision-step">
        <p class="muted">Reveal the approach and verify the plan in your mind before writing code.</p>
        <div class="step-content"><strong>Approach</strong><p>${escapeHtml(question.approach || 'No approach saved yet.')}</p></div>
      </div>
    `,
    3: `
      <div class="revision-step">
        <p class="muted">Now reveal the important notes to check if your understanding is complete.</p>
        <div class="step-content"><strong>Important Notes</strong><p>${escapeHtml(question.notes || 'No notes saved yet.')}</p></div>
      </div>
    `,
    4: `
      <div class="revision-step">
        <p class="muted">Review mistakes and lessons before checking the code.</p>
        <div class="step-content"><strong>Mistakes & Lessons</strong><p>${escapeHtml(question.mistakes || 'No mistakes logged yet.')}</p></div>
      </div>
    `,
    5: `
      <div class="revision-step">
        <p class="muted">When ready, open the solution to compare with your recalled answer.</p>
        <a href="solution.html?id=${encodeURIComponent(question.id)}" class="btn btn-outline">Reveal Solution</a>
      </div>
    `,
    6: `
      <div class="revision-step confidence-step">
        <p class="muted">How well did you remember this question?</p>
        <div class="confidence-grid">${CONFIDENCE_OPTIONS.map(option => `
          <button class="btn confidence-btn ${state.confidence === option.value ? 'active' : ''}" data-action="choose-confidence" data-value="${option.value}">${option.label}</button>
        `).join('')}</div>
        <button class="btn btn-primary" data-action="mark-revised">Mark Revised</button>
      </div>
    `
  };

  return stepContent[state.revisionStep] || '';
}

function getRevisionButtonLabel() {
  if (state.revisionStep < 5) return 'Reveal Next';
  if (state.revisionStep === 5) return 'Go to Confidence';
  return 'Finalize Revision';
}

function refreshDerivedState() {
  state.question.weakAreas = state.question.weakAreas || [];
  renderPage(document.getElementById('notesRoot'));
  attachListeners(document.getElementById('notesRoot'));
}

function attachListeners(root) {
  if (!root) return;

  root.querySelectorAll('[data-action="toggle-section"]').forEach(button => {
    button.addEventListener('click', event => {
      const card = event.target.closest('.collapsible');
      if (card) card.classList.toggle('expanded');
    });
  });

  root.querySelectorAll('[data-action="edit-section"]').forEach(button => {
    button.addEventListener('click', event => {
      const section = event.target.dataset.section;
      toggleEditor(section);
    });
  });

  root.querySelector('[data-action="next-step"]')?.addEventListener('click', () => {
    if (state.revisionStep < 6) {
      state.revisionStep += 1;
    }
    renderPage(root);
    attachListeners(root);
  });

  root.querySelector('[data-action="mark-revised"]')?.addEventListener('click', () => {
    markAsRevised();
    alert('Revision marked. Your next scheduled review is updated.');
    refreshDerivedState();
  });

  root.querySelectorAll('[data-action="choose-confidence"]').forEach(button => {
    button.addEventListener('click', event => {
      const value = event.target.dataset.value;
      setConfidence(value);
      refreshDerivedState();
    });
  });

  root.querySelector('[data-action="add-highlight"]')?.addEventListener('click', () => {
    const category = window.prompt('Highlight category: Key Insight, Interview Trick, Common Mistake, Edge Case');
    const text = window.prompt('Enter the highlight text');
    if (!category || !text) return;
    addHighlight(category.trim(), text.trim());
    refreshDerivedState();
  });

  root.querySelector('[data-action="refresh-flashcards"]')?.addEventListener('click', () => {
    refreshDerivedState();
    alert('Flashcards refreshed.');
  });
}

function toggleEditor(section) {
  const root = document.getElementById('notesRoot');
  if (!root) return;
  const editor = root.querySelector(`.content-editor[data-editor="${section}"]`);
  if (!editor) return;

  const isEditing = editor.classList.toggle('editing');
  if (isEditing) {
    const content = state.question[section] || '';
    editor.innerHTML = `
      <textarea class="section-textarea" data-editor="${section}">${escapeHtml(content)}</textarea>
      <div class="editor-actions">
        <button class="btn btn-primary" data-action="save-section" data-section="${section}">Save</button>
        <button class="btn btn-outline" data-action="cancel-section" data-section="${section}">Cancel</button>
      </div>
    `;
    attachEditorListeners(root, section);
  }
}

function attachEditorListeners(root, section) {
  root.querySelector(`[data-action="save-section"][data-section="${section}"]`)?.addEventListener('click', () => {
    const textarea = root.querySelector(`.section-textarea[data-editor="${section}"]`);
    if (!textarea) return;
    state.question[section] = textarea.value.trim();
    saveQuestion(state.question);
    refreshDerivedState();
  });

  root.querySelector(`[data-action="cancel-section"][data-section="${section}"]`)?.addEventListener('click', () => {
    refreshDerivedState();
  });
}

function addHighlight(category, text) {
  state.question.highlights.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, category, type: category.toLowerCase().replace(/\s+/g, '-'), text });
  saveQuestion(state.question);
}

function setConfidence(value) {
  state.confidence = value;
  state.question.confidence = value;
  state.question.confidenceHistory = state.question.confidenceHistory || [];
  state.question.confidenceHistory.push({ value, timestamp: new Date().toISOString() });
  saveQuestion(state.question);
}

function markAsRevised() {
  const question = state.question;
  const today = new Date().toISOString().split('T')[0];
  question.lastRevisionDate = today;
  question.revisionCount = (question.revisionCount || 0) + 1;
  question.revisionStatus = 'Revised';
  question.revisionHistory = question.revisionHistory || [];
  question.revisionHistory.push({ date: today, confidence: state.confidence || 'unrated' });
  saveQuestion(question);
}

function getNextRevision(question) {
  const today = new Date().toISOString().split('T')[0];
  const futureDates = REVISION_INTERVALS.map(days => question[`revision${days}`]).filter(Boolean).filter(date => date >= today);
  if (futureDates.length === 0) return '';
  return futureDates.sort()[0];
}

function extractFirstSentence(text) {
  if (!text) return '';
  const match = text.trim().match(/(.+?\.?)(\s|$)/);
  return match ? match[1].trim() : text.trim();
}

function extractMatch(text, regex) {
  if (!text) return '';
  const match = text.match(regex);
  return match ? match[0].trim() : '';
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>\"]+/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[match]));
}
