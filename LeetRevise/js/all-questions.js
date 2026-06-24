const STORAGE_KEY = 'leetcodeQuestions';
let allQuestions = [];
let filteredQuestions = [];
let currentPage = 1;
let pageSize = 10;
let activeQuestionId = null;
let activeEditId = null;
let isNotesEditing = false;

const revisionKeys = ['revision2','revision5','revision15','revision30','revision45','revision60'];

window.addEventListener('DOMContentLoaded', () => {
  loadQuestions();
  renderStats();
  setupEventListeners();
  applyFilters();
});

function loadQuestions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    allQuestions = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Invalid stored questions:', error);
    allQuestions = [];
  }

  let updated = false;
  allQuestions = allQuestions.map(question => {
    const normalized = normalizeQuestion(question);
    if (normalized._needsSave) {
      updated = true;
    }
    return normalized;
  });

  if (updated) {
    saveQuestions();
  }
}

function normalizeQuestion(question) {
  const normalized = { ...question };

  if (!normalized.id) {
    normalized.id = generateId();
    normalized._needsSave = true;
  }

  normalized.title = String(normalized.title || '').trim();
  normalized.link = String(normalized.link || '').trim();
  normalized.difficulty = normalized.difficulty || 'Medium';
  normalized.topics = String(normalized.topics || normalized.tags || '').trim();
  normalized.notes = String(normalized.notes || '').trim();
  normalized.approach = String(normalized.approach || '').trim();
  normalized.solution = String(normalized.solution || '').trim();
  normalized.timeComplexity = String(normalized.timeComplexity || '').trim();
  normalized.spaceComplexity = String(normalized.spaceComplexity || '').trim();
  normalized.status = normalized.status || 'Solved';
  normalized.bookmarked = !!normalized.bookmarked;
  normalized.dateAdded = normalized.dateAdded || normalized.solvedDate || getToday();
  normalized.lastRevisionDate = normalized.lastRevisionDate || getLastRevisionDate(normalized) || normalized.dateAdded;
  normalized.revisionCount = revisionKeys.reduce((count, key) => count + (normalized[key] ? 1 : 0), 0);
  normalized.revisionStatus = computeRevisionStatus(normalized);

  if (normalized._needsSave) {
    delete normalized._needsSave;
  }

  return normalized;
}

function generateId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getLastRevisionDate(question) {
  const dates = revisionKeys.filter(key => question[key]).map(key => question[key]);
  const today = getToday();
  const past = dates.filter(d => d <= today);
  if (past.length) {
    return past.sort().pop();
  }
  return dates.sort().pop();
}

function computeRevisionStatus(question) {
  const today = getToday();
  const dates = revisionKeys.filter(key => question[key]).map(key => question[key]);
  if (!dates.length) {
    return 'Revised';
  }

  const mastered = question.revision60 && question.revision60 < today;
  if (mastered) {
    return 'Mastered';
  }

  if (dates.includes(today)) {
    return 'Due Today';
  }

  const overdue = dates.some(d => d < today);
  if (overdue) {
    return 'Overdue';
  }

  const futureSoon = dates.some(d => d > today);
  if (futureSoon) {
    return 'Upcoming';
  }

  return 'Revised';
}

function saveQuestions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allQuestions));
}

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const topbarSearch = document.getElementById('topbarSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const difficultyFilter = document.getElementById('difficultyFilter');
  const revisionFilter = document.getElementById('revisionFilter');
  const topicFilter = document.getElementById('topicFilter');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const favoritesOnly = document.getElementById('favoritesOnly');
  const pageSizeSelect = document.getElementById('pageSizeSelect');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const selectAll = document.getElementById('selectAll');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const markRevisedBtn = document.getElementById('markRevisedBtn');
  const addTagBtn = document.getElementById('addTagBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  if (topbarSearch) topbarSearch.addEventListener('input', event => {
    if (searchInput) {
      searchInput.value = event.target.value;
      currentPage = 1;
      applyFilters();
    }
  });
  if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (topbarSearch) topbarSearch.value = '';
    currentPage = 1;
    applyFilters();
  });

  [sortSelect, difficultyFilter, revisionFilter, topicFilter, dateFrom, dateTo, favoritesOnly].forEach(control => {
    if (control) control.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  });

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', event => {
      pageSize = Number(event.target.value) || 10;
      currentPage = 1;
      renderTable();
    });
  }

  if (prevPageBtn) prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderTable();
    }
  });
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
    if (currentPage < totalPages) {
      currentPage += 1;
      renderTable();
    }
  });

  if (selectAll) {
    selectAll.addEventListener('change', event => {
      document.querySelectorAll('.row-select').forEach(checkbox => {
        checkbox.checked = event.target.checked;
      });
    });
  }

  if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', handleBulkDelete);
  if (markRevisedBtn) markRevisedBtn.addEventListener('click', handleBulkMarkRevised);
  if (addTagBtn) addTagBtn.addEventListener('click', handleBulkAddTag);
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportCurrent('csv'));
  if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => exportCurrent('xlsx'));
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => exportCurrent('pdf'));

  const closeEditModalBtn = document.getElementById('closeEditModalBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const editQuestionForm = document.getElementById('editQuestionForm');
  const closeRevisionModalBtn = document.getElementById('closeRevisionModalBtn');
  const closeRevisionModalAction = document.getElementById('closeRevisionModalAction');

  if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
  if (editQuestionForm) editQuestionForm.addEventListener('submit', saveEditedQuestion);
  if (closeRevisionModalBtn) closeRevisionModalBtn.addEventListener('click', closeRevisionHistoryModal);
  if (closeRevisionModalAction) closeRevisionModalAction.addEventListener('click', closeRevisionHistoryModal);

  document.addEventListener('click', event => {
    if (event.target.matches('.favorite-toggle')) {
      const questionId = event.target.closest('tr.question-row')?.dataset.id;
      if (questionId) toggleFavorite(questionId);
    }
  });
}

function applyFilters() {
  const text = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const difficulty = document.getElementById('difficultyFilter')?.value || 'All';
  const revisionFilter = document.getElementById('revisionFilter')?.value || 'All';
  const topicFilter = document.getElementById('topicFilter')?.value || 'All';
  const fromDate = document.getElementById('dateFrom')?.value;
  const toDate = document.getElementById('dateTo')?.value;
  const favoritesOnly = document.getElementById('favoritesOnly')?.checked;

  filteredQuestions = allQuestions.filter(question => {
    if (favoritesOnly && !question.bookmarked) {
      return false;
    }
    if (difficulty !== 'All' && question.difficulty !== difficulty) {
      return false;
    }
    if (revisionFilter !== 'All' && question.revisionStatus !== revisionFilter) {
      return false;
    }
    if (topicFilter !== 'All') {
      const topics = question.topics.toLowerCase();
      if (!topics.includes(topicFilter.toLowerCase())) {
        return false;
      }
    }
    if (fromDate && question.dateAdded < fromDate) {
      return false;
    }
    if (toDate && question.dateAdded > toDate) {
      return false;
    }
    if (text) {
      const searchable = [question.title, question.topics, question.notes, question.approach, question.solution].join(' ').toLowerCase();
      if (!searchable.includes(text)) {
        return false;
      }
    }
    return true;
  });

  sortFiltered();
  currentPage = 1;
  renderStats();
  renderTable();
}

function sortFiltered() {
  const sortValue = document.getElementById('sortSelect')?.value || 'dateAdded_desc';
  const [field, order] = sortValue.split('_');

  filteredQuestions.sort((a, b) => {
    let valueA = a[field] || '';
    let valueB = b[field] || '';

    if (field === 'difficulty') {
      const orderMap = { Easy: 1, Medium: 2, Hard: 3 };
      valueA = orderMap[valueA] || 4;
      valueB = orderMap[valueB] || 4;
    }

    if (field === 'revisionCount') {
      valueA = a.revisionCount || 0;
      valueB = b.revisionCount || 0;
    }

    if (field === 'dateAdded' || field === 'lastRevisionDate') {
      valueA = valueA || '0000-00-00';
      valueB = valueB || '0000-00-00';
    }

    if (valueA < valueB) return order === 'asc' ? -1 : 1;
    if (valueA > valueB) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

function renderStats() {
  const total = allQuestions.length;
  const easy = allQuestions.filter(q => q.difficulty === 'Easy').length;
  const medium = allQuestions.filter(q => q.difficulty === 'Medium').length;
  const hard = allQuestions.filter(q => q.difficulty === 'Hard').length;
  const notesCount = allQuestions.filter(q => q.notes).length;
  const favorites = allQuestions.filter(q => q.bookmarked).length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statEasy').textContent = easy;
  document.getElementById('statMedium').textContent = medium;
  document.getElementById('statHard').textContent = hard;
  document.getElementById('statNotes').textContent = notesCount;
  document.getElementById('statFavorites').textContent = favorites;
}

function renderTable() {
  const tbody = document.getElementById('questionsTableBody');
  const resultCount = document.getElementById('resultCount');
  const pageInfo = document.getElementById('pageInfo');
  const emptyState = document.getElementById('emptyState');

  if (!tbody || !resultCount || !pageInfo || !emptyState) return;

  tbody.innerHTML = '';
  if (!filteredQuestions.length) {
    emptyState.classList.remove('hidden');
    resultCount.textContent = '0 questions shown';
    pageInfo.textContent = 'Page 0 of 0';
    return;
  }

  emptyState.classList.add('hidden');
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredQuestions.slice(start, start + pageSize);

  pageItems.forEach(question => {
    const row = document.createElement('tr');
    row.className = 'question-row';
    row.dataset.id = question.id;
    row.title = question.notes ? question.notes.slice(0, 100) + (question.notes.length > 100 ? '…' : '') : 'No notes preview available';
    const statusClass = question.revisionStatus.replace(/\s+/g, '-');

    row.innerHTML = `
      <td data-label="Select"><label class="filter-checkbox small-checkbox"><input type="checkbox" class="row-select" value="${question.id}"><span class="checkbox-mark"></span></label></td>
      <td data-label="Problem Name">
        <div class="problem-title">
          <strong>${escapeHtml(question.title)}</strong>
          <div class="note-subtitle">${escapeHtml(question.link ? question.link.replace(/^https?:\/\//, '') : question.topics || 'No topic')}</div>
        </div>
      </td>
      <td data-label="Difficulty">${escapeHtml(question.difficulty)}</td>
      <td data-label="Topic"><span class="tag-pill">${escapeHtml(question.topics || '—')}</span></td>
      <td data-label="Date Added">${escapeHtml(question.dateAdded)}</td>
      <td data-label="Last Revision">${escapeHtml(question.lastRevisionDate)}</td>
      <td data-label="Status"><span class="status-chip ${statusClass}">${escapeHtml(question.revisionStatus)}</span></td>
      <td data-label="Notes">${question.notes ? '<span>Yes</span>' : '<span>No</span>'}</td>
      <td data-label="Actions">
        <div class="action-buttons">
          <button type="button" class="btn action-btn" data-action="notes">Notes</button>
          <button type="button" class="btn action-btn" data-action="solution">Solution</button>
          <button type="button" class="btn action-btn" data-action="edit">Edit</button>
          <button type="button" class="btn action-btn" data-action="delete">Delete</button>
          <a href="${escapeHtml(question.link || '#')}" target="_blank" rel="noreferrer" class="btn action-btn">Open</a>
          <button type="button" class="btn action-btn" data-action="history">History</button>
          <button type="button" class="favorite-toggle ${question.bookmarked ? 'active' : ''}" title="Toggle favorite">★</button>
        </div>
      </td>
    `;

    row.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => handleActionClick(btn.dataset.action, question.id));
    });

    tbody.appendChild(row);
  });

  resultCount.textContent = `${filteredQuestions.length} question${filteredQuestions.length === 1 ? '' : 's'} shown`;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function handleActionClick(action, questionId) {
  const question = allQuestions.find(q => q.id === questionId);
  if (!question) return;

  if (action === 'notes') {
    window.location.href = `notes.html?id=${encodeURIComponent(question.id)}`;
  }
  if (action === 'solution') {
    window.location.href = `solution.html?id=${encodeURIComponent(question.id)}`;
  }
  if (action === 'edit') {
    openEditModal(question);
  }
  if (action === 'delete') {
    deleteQuestion(questionId);
  }
  if (action === 'history') {
    openRevisionHistoryModal(question);
  }
}

function openEditModal(question) {
  activeEditId = question.id;
  document.getElementById('editingModal').classList.remove('hidden');
  document.getElementById('editTitle').value = question.title;
  document.getElementById('editLink').value = question.link;
  document.getElementById('editDifficulty').value = question.difficulty;
  document.getElementById('editTopics').value = question.topics;
  document.getElementById('editTimeComplexity').value = question.timeComplexity;
  document.getElementById('editSpaceComplexity').value = question.spaceComplexity;
  document.getElementById('editDateAdded').value = question.dateAdded;
  document.getElementById('editLastRevisionDate').value = question.lastRevisionDate;
  document.getElementById('editNotes').value = question.notes;
  document.getElementById('editApproach').value = question.approach;
  document.getElementById('editSolution').value = question.solution;
}

function closeEditModal() {
  document.getElementById('editingModal').classList.add('hidden');
  activeEditId = null;
}

function saveEditedQuestion(event) {
  event.preventDefault();
  if (!activeEditId) return;
  const question = allQuestions.find(q => q.id === activeEditId);
  if (!question) return;

  question.title = document.getElementById('editTitle').value.trim();
  question.link = document.getElementById('editLink').value.trim();
  question.difficulty = document.getElementById('editDifficulty').value;
  question.topics = document.getElementById('editTopics').value.trim();
  question.timeComplexity = document.getElementById('editTimeComplexity').value.trim();
  question.spaceComplexity = document.getElementById('editSpaceComplexity').value.trim();
  question.dateAdded = document.getElementById('editDateAdded').value || getToday();
  question.lastRevisionDate = document.getElementById('editLastRevisionDate').value || getLastRevisionDate(question);
  question.notes = document.getElementById('editNotes').value.trim();
  question.approach = document.getElementById('editApproach').value.trim();
  question.solution = document.getElementById('editSolution').value.trim();
  question.revisionStatus = computeRevisionStatus(question);
  question.revisionCount = revisionKeys.reduce((count, key) => count + (question[key] ? 1 : 0), 0);
  saveQuestions();
  renderStats();
  renderTable();
  closeEditModal();
}

function deleteQuestion(questionId) {
  if (!window.confirm('Delete this question from your library?')) return;
  allQuestions = allQuestions.filter(q => q.id !== questionId);
  saveQuestions();
  applyFilters();
}

function openRevisionHistoryModal(question) {
  const revisionList = revisionKeys.map(key => ({ label: key.replace(/revision/, 'Revision '), value: question[key] || '—' }));
  const content = [`<div class="modal-section"><h4>${escapeHtml(question.title)}</h4><p><strong>Difficulty:</strong> ${escapeHtml(question.difficulty)}</p></div>`, '<div class="modal-section"><h4>Revision Dates</h4>', '<ul>']
    .concat(revisionList.map(entry => `<li><strong>${escapeHtml(entry.label)}:</strong> ${escapeHtml(entry.value)}</li>`))
    .concat(['</ul>', `<div class="modal-section"><strong>Current Status:</strong> ${escapeHtml(question.revisionStatus)}</div>`])
    .join('');

  const body = document.getElementById('revisionHistoryBody');
  if (body) {
    body.innerHTML = content;
  }
  document.getElementById('revisionHistoryModal').classList.remove('hidden');
}

function closeRevisionHistoryModal() {
  document.getElementById('revisionHistoryModal').classList.add('hidden');
}

function toggleFavorite(questionId) {
  const question = allQuestions.find(q => q.id === questionId);
  if (!question) return;
  question.bookmarked = !question.bookmarked;
  saveQuestions();
  renderStats();
  renderTable();
}

function getSelectedIds() {
  return Array.from(document.querySelectorAll('.row-select:checked')).map(input => input.value);
}

function handleBulkDelete() {
  const ids = getSelectedIds();
  if (!ids.length) {
    alert('Select at least one question first.');
    return;
  }
  if (!window.confirm(`Delete ${ids.length} selected question${ids.length === 1 ? '' : 's'}?`)) return;
  allQuestions = allQuestions.filter(question => !ids.includes(question.id));
  saveQuestions();
  applyFilters();
}

function handleBulkMarkRevised() {
  const ids = getSelectedIds();
  if (!ids.length) {
    alert('Select at least one question first.');
    return;
  }
  const today = getToday();
  ids.forEach(id => {
    const question = allQuestions.find(q => q.id === id);
    if (question) {
      question.lastRevisionDate = today;
      question.revisionStatus = 'Revised';
    }
  });
  saveQuestions();
  renderTable();
}

function handleBulkAddTag() {
  const ids = getSelectedIds();
  if (!ids.length) {
    alert('Select at least one question first.');
    return;
  }
  const tag = window.prompt('Enter a tag to add to selected questions:');
  if (!tag) return;
  ids.forEach(id => {
    const question = allQuestions.find(q => q.id === id);
    if (question) {
      const topics = question.topics ? question.topics.split(',').map(t => t.trim()) : [];
      if (!topics.includes(tag.trim())) {
        topics.push(tag.trim());
      }
      question.topics = topics.filter(Boolean).join(', ');
    }
  });
  saveQuestions();
  applyFilters();
}

function exportCurrent(format) {
  const ids = getSelectedIds();
  const exportItems = ids.length ? allQuestions.filter(q => ids.includes(q.id)) : filteredQuestions;
  if (!exportItems.length) {
    alert('No questions available to export.');
    return;
  }

  const rows = exportItems.map(question => ({
    Title: question.title,
    Difficulty: question.difficulty,
    Topics: question.topics,
    DateAdded: question.dateAdded,
    LastRevision: question.lastRevisionDate,
    Status: question.revisionStatus,
    Notes: question.notes,
    Approach: question.approach,
    TimeComplexity: question.timeComplexity,
    SpaceComplexity: question.spaceComplexity,
    Link: question.link
  }));

  if (format === 'csv') {
    downloadTextFile(rowsToCsv(rows), 'leetrevise-questions.csv', 'text/csv');
  } else if (format === 'xlsx') {
    const html = csvToExcelHtml(rows);
    downloadTextFile(html, 'leetrevise-questions.xls', 'application/vnd.ms-excel');
  } else if (format === 'pdf') {
    exportToPdf(rows);
  }
}

function rowsToCsv(rows) {
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(
    rows.map(row => headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(','))
  );
  return csv.join('\n');
}

function csvToExcelHtml(rows) {
  const headers = Object.keys(rows[0]);
  const tableRows = rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header] || '')}</td>`).join('')}</tr>`).join('');
  return `<html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`;
}

function exportToPdf(rows) {
  const headers = Object.keys(rows[0]);
  const tableHeader = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tableRows = rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header] || '')}</td>`).join('')}</tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Export</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;padding:24px;}table{width:100%;border-collapse:collapse;}th,td{padding:8px 10px;border:1px solid #ccc;text-align:left;vertical-align:top;}th{background:#f3f3f3;}</style></head><body><h1>LeetRevise Export</h1><table>${tableHeader}${tableRows}</table></body></html>`;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Unable to open print window. Please allow popups.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function downloadTextFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"]+/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[match]));
}
