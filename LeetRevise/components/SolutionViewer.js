const STORAGE_KEY = 'leetcodeQuestions';
let state = {
  question: null,
  editing: false
};

export function initializeSolutionViewer() {
  const root = document.getElementById('solutionRoot');
  if (!root) return;

  const questionId = new URLSearchParams(window.location.search).get('id');
  const question = loadQuestion(questionId);
  if (!question) {
    root.innerHTML = `<div class="page-empty"><h2>Question Not Found</h2><p>The solution could not be loaded. Return to <a href="all-questions.html">All Questions</a>.</p></div>`;
    return;
  }

  state.question = question;
  renderPage(root);
  attachListeners(root);
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

  root.innerHTML = `
    <section class="page-header solution-header">
      <div>
        <h2>Solution Viewer</h2>
        <p class="subtitle">Show only the code solution for ${escapeHtml(question.title)}</p>
      </div>
      <div class="header-actions">
        <a href="all-questions.html" class="btn btn-outline">Back to Library</a>
        <a href="notes.html?id=${encodeURIComponent(question.id)}" class="btn btn-primary">View Notes</a>
      </div>
    </section>

    <section class="solution-grid">
      <aside class="solution-sidebar">
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
        </div>
      </aside>

      <div class="solution-main">
        <div class="code-panel card">
          <div class="code-header">
            <div>
              <h3>Solution Code</h3>
              <p class="muted">This view hides learning notes and focuses on implementation.</p>
            </div>
            <div class="code-actions">
              <button class="btn btn-outline" data-action="copy-code">Copy Code</button>
              <button class="btn btn-outline" data-action="download-code">Download</button>
              <button class="btn btn-outline" data-action="edit-solution">Edit</button>
            </div>
          </div>
          <div class="solution-body" data-view="code">
            <pre class="solution-code"><code>${escapeHtml(question.solution || '// No solution stored yet.')}</code></pre>
          </div>
          <div class="solution-body hidden" data-view="editor">
            <textarea class="solution-editor" data-editor="solutionText">${escapeHtml(question.solution || '')}</textarea>
            <div class="editor-actions">
              <button class="btn btn-primary" data-action="save-solution">Save</button>
              <button class="btn btn-outline" data-action="cancel-solution">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function attachListeners(root) {
  if (!root) return;
  root.querySelector('[data-action="copy-code"]')?.addEventListener('click', () => {
    const code = state.question.solution || '';
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copied to clipboard');
    }).catch(() => {
      alert('Unable to copy code.');
    });
  });

  root.querySelector('[data-action="download-code"]')?.addEventListener('click', () => {
    const code = state.question.solution || '';
    const filename = `${sanitizeFilename(state.question.title || 'solution')}.txt`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });

  root.querySelector('[data-action="edit-solution"]')?.addEventListener('click', () => {
    state.editing = true;
    toggleSolutionView(root, true);
  });

  root.querySelector('[data-action="save-solution"]')?.addEventListener('click', () => {
    const textarea = root.querySelector('.solution-editor');
    if (!textarea) return;
    state.question.solution = textarea.value.trim();
    saveQuestion(state.question);
    state.editing = false;
    renderPage(root);
    attachListeners(root);
  });

  root.querySelector('[data-action="cancel-solution"]')?.addEventListener('click', () => {
    state.editing = false;
    toggleSolutionView(root, false);
  });
}

function toggleSolutionView(root, editing) {
  root.querySelector('[data-view="code"]')?.classList.toggle('hidden', editing);
  root.querySelector('[data-view="editor"]')?.classList.toggle('hidden', !editing);
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>\"]+/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[match]));
}

function sanitizeFilename(text) {
  return String(text || 'solution').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
}
