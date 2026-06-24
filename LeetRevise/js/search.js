/**
 * Search System
 * Provides instant search with multiple filters
 */

let allQuestions = [];
let filteredQuestions = [];
let currentView = 'list';

document.addEventListener('DOMContentLoaded', () => {
  initializeSearch();
});

/**
 * Initialize search system
 */
function initializeSearch() {
  loadQuestions();
  setupEventListeners();
  renderTopicsAndTags();
  applyUrlFilters();
  displayResults();
}

/**
 * Load questions from localStorage
 */
function loadQuestions() {
  try {
    const stored = localStorage.getItem('leetcodeQuestions');
    if (stored) {
      allQuestions = JSON.parse(stored);
    } else {
      allQuestions = generateSampleQuestions();
      localStorage.setItem('leetcodeQuestions', JSON.stringify(allQuestions));
    }

    // Initialize bookmarks and tags if not present
    allQuestions.forEach(q => {
      if (!q.bookmarked) {
        q.bookmarked = false;
      }
      if (!q.tags) {
        q.tags = q.topics || '';
      }
    });

    console.log(`Loaded ${allQuestions.length} questions`);
  } catch (error) {
    console.error('Error loading questions:', error);
    allQuestions = generateSampleQuestions();
  }
}

/**
 * Generate sample questions for demo
 */
function generateSampleQuestions() {
  const today = new Date();
  const getDateStr = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      title: 'Two Sum',
      link: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'Easy',
      topics: 'Array, Hash Map',
      tags: 'Two Pointers, Hash Table, Lookup',
      approach: 'Use hash map for O(n) solution',
      status: 'Solved',
      solvedDate: getDateStr(5),
      bookmarked: true
    },
    {
      title: 'Add Two Numbers',
      link: 'https://leetcode.com/problems/add-two-numbers/',
      difficulty: 'Medium',
      topics: 'Linked List, Math',
      tags: 'Carry, Linked List, Iteration',
      approach: 'Traverse and handle carry',
      status: 'Solved',
      solvedDate: getDateStr(3)
    },
    {
      title: 'Longest Substring Without Repeating Characters',
      link: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
      difficulty: 'Medium',
      topics: 'String, Sliding Window, Hash Map',
      tags: 'Window, Character Map, Two Pointers',
      approach: 'Two pointer sliding window',
      status: 'Solved',
      solvedDate: getDateStr(7)
    },
    {
      title: 'Median of Two Sorted Arrays',
      link: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
      difficulty: 'Hard',
      topics: 'Array, Binary Search',
      tags: 'Divide and Conquer, Logarithmic',
      approach: 'Binary search on smaller array',
      status: 'Attempted',
      solvedDate: getDateStr(10)
    },
    {
      title: 'Regular Expression Matching',
      link: 'https://leetcode.com/problems/regular-expression-matching/',
      difficulty: 'Hard',
      topics: 'String, Dynamic Programming, Backtracking',
      tags: 'DP, Pattern Matching, Recursion',
      approach: 'DP with pattern matching',
      status: 'Unsolved',
      solvedDate: getDateStr(14)
    },
    {
      title: 'Container With Most Water',
      link: 'https://leetcode.com/problems/container-with-most-water/',
      difficulty: 'Medium',
      topics: 'Array, Two Pointers',
      tags: 'Greedy, Two Pointers, Optimization',
      approach: 'Two pointer greedy approach',
      status: 'Solved',
      solvedDate: getDateStr(2),
      bookmarked: true
    }
  ];
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search input
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const topbarSearch = document.getElementById('topbarSearchInput');
    if (topbarSearch) {
      topbarSearch.value = e.target.value;
    }
    performSearch();
  });

  // Clear search
  document.getElementById('clearSearchBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    performSearch();
  });

  // Difficulty filters
  document.querySelectorAll('input[name="difficulty"]').forEach(input => {
    input.addEventListener('change', performSearch);
  });

  // Status filters
  document.querySelectorAll('input[name="status"]').forEach(input => {
    input.addEventListener('change', performSearch);
  });

  // Bookmark filter
  document.getElementById('bookmarkedOnly').addEventListener('change', performSearch);

  // Date filters
  document.getElementById('dateFrom').addEventListener('change', performSearch);
  document.getElementById('dateTo').addEventListener('change', performSearch);

  // Topic checkboxes
  document.addEventListener('change', (e) => {
    if (e.target.name === 'topic') {
      performSearch();
    }
  });

  // Topic search
  document.getElementById('topicSearch').addEventListener('input', (e) => {
    filterTopicsList(e.target.value);
  });

  // Tag checkboxes
  document.addEventListener('change', (e) => {
    if (e.target.name === 'tag') {
      performSearch();
    }
  });

  // Tag search
  document.getElementById('tagsSearch').addEventListener('input', (e) => {
    filterTagsList(e.target.value);
  });

  // Topbar instant search
  const topbarSearch = document.getElementById('topbarSearchInput');
  if (topbarSearch) {
    topbarSearch.addEventListener('input', (e) => {
      document.getElementById('searchInput').value = e.target.value;
      performSearch();
    });
  }

  // Reset filters
  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);

  // View controls
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      renderResults();
    });
  });
}

/**
 * Render topics and tags dynamically
 */
function renderTopicsAndTags() {
  const topics = new Set();
  const tags = new Set();

  allQuestions.forEach(q => {
    if (q.topics) {
      q.topics.split(',').forEach(t => topics.add(t.trim()));
    }
    if (q.tags) {
      q.tags.split(',').forEach(t => tags.add(t.trim()));
    }
  });

  const topicsList = document.getElementById('topicsList');
  const tagsList = document.getElementById('tagsList');
  topicsList.innerHTML = '';
  tagsList.innerHTML = '';

  topics.forEach(topic => {
    const label = document.createElement('label');
    label.className = 'filter-checkbox';
    label.innerHTML = `
      <input type="checkbox" name="topic" value="${escapeHtml(topic)}">
      <span class="checkbox-mark"></span>
      <span>${escapeHtml(topic)}</span>
    `;
    topicsList.appendChild(label);
  });

  tags.forEach(tag => {
    const label = document.createElement('label');
    label.className = 'filter-checkbox';
    label.innerHTML = `
      <input type="checkbox" name="tag" value="${escapeHtml(tag)}">
      <span class="checkbox-mark"></span>
      <span>${escapeHtml(tag)}</span>
    `;
    tagsList.appendChild(label);
  });
}

function applyUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const searchInput = document.getElementById('searchInput');

  const query = params.get('search') || params.get('q');
  if (query && searchInput) {
    searchInput.value = query;
  }

  const difficulties = params.getAll('difficulty');
  difficulties.forEach(value => {
    const input = document.querySelector(`input[name="difficulty"][value="${value}"]`);
    if (input) input.checked = true;
  });

  const statuses = params.getAll('status');
  statuses.forEach(value => {
    const input = document.querySelector(`input[name="status"][value="${value}"]`);
    if (input) input.checked = true;
  });

  const topic = params.get('topic');
  if (topic) {
    const input = Array.from(document.querySelectorAll('input[name="topic"]')).find(i => i.value === topic);
    if (input) input.checked = true;
  }

  const tags = params.getAll('tag');
  tags.forEach(value => {
    const input = Array.from(document.querySelectorAll('input[name="tag"]')).find(i => i.value === value);
    if (input) input.checked = true;
  });

  const bookmarked = params.get('bookmarked');
  if (bookmarked === '1' || bookmarked === 'true') {
    const input = document.getElementById('bookmarkedOnly');
    if (input) input.checked = true;
  }

  const dateFrom = params.get('dateFrom');
  if (dateFrom) {
    const input = document.getElementById('dateFrom');
    if (input) input.value = dateFrom;
  }

  const dateTo = params.get('dateTo');
  if (dateTo) {
    const input = document.getElementById('dateTo');
    if (input) input.value = dateTo;
  }
}

/**
 * Filter topics list by search
 */
function filterTopicsList(searchTerm) {
  const topicCheckboxes = document.querySelectorAll('input[name="topic"]');
  topicCheckboxes.forEach(input => {
    const label = input.closest('.filter-checkbox');
    const matches = input.value.toLowerCase().includes(searchTerm.toLowerCase());
    label.style.display = matches ? '' : 'none';
  });
}

/**
 * Filter tags list by search
 */
function filterTagsList(searchTerm) {
  const tagCheckboxes = document.querySelectorAll('input[name="tag"]');
  tagCheckboxes.forEach(input => {
    const label = input.closest('.filter-checkbox');
    const matches = input.value.toLowerCase().includes(searchTerm.toLowerCase());
    label.style.display = matches ? '' : 'none';
  });
}

/**
 * Perform search and filter
 */
function performSearch() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const selectedDifficulties = Array.from(document.querySelectorAll('input[name="difficulty"]:checked')).map(el => el.value);
  const selectedStatuses = Array.from(document.querySelectorAll('input[name="status"]:checked')).map(el => el.value);
  const selectedTopics = Array.from(document.querySelectorAll('input[name="topic"]:checked')).map(el => el.value);
  const selectedTags = Array.from(document.querySelectorAll('input[name="tag"]:checked')).map(el => el.value);
  const bookmarkedOnly = document.getElementById('bookmarkedOnly').checked;
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;

  filteredQuestions = allQuestions.filter(q => {
    // Search term filter
    if (searchTerm) {
      const searchableText = `${q.title} ${q.topics || ''} ${q.approach || ''} ${q.tags || ''}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    // Difficulty filter
    if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(q.difficulty)) {
      return false;
    }

    // Status filter
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(q.status)) {
      return false;
    }

    // Topic filter
    if (selectedTopics.length > 0) {
      const questionTopics = q.topics.split(',').map(t => t.trim());
      const hasMatchingTopic = selectedTopics.some(topic => questionTopics.includes(topic));
      if (!hasMatchingTopic) {
        return false;
      }
    }

    // Tag filter
    if (selectedTags.length > 0) {
      const questionTags = (q.tags || q.topics || '').split(',').map(t => t.trim());
      const hasMatchingTag = selectedTags.some(tag => questionTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Bookmark filter
    if (bookmarkedOnly && !q.bookmarked) {
      return false;
    }

    // Date filter
    if (dateFrom) {
      if (new Date(q.solvedDate) < new Date(dateFrom)) {
        return false;
      }
    }

    if (dateTo) {
      if (new Date(q.solvedDate) > new Date(dateTo)) {
        return false;
      }
    }

    return true;
  });

  renderResults();
}

/**
 * Render results
 */
function renderResults() {
  const container = document.getElementById('resultsContainer');
  const resultCount = document.getElementById('resultCount');

  resultCount.textContent = filteredQuestions.length;

  if (filteredQuestions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No questions found. Try adjusting your filters.</p>
      </div>
    `;
    return;
  }

  container.className = `results-container ${currentView}-view`;
  container.innerHTML = '';

  filteredQuestions.forEach((question, index) => {
    const card = createQuestionCard(question, index);
    container.appendChild(card);
  });
}

/**
 * Create question card
 */
function createQuestionCard(question, index) {
  const card = document.createElement('div');
  card.className = 'question-result';

  const topicTags = question.topics ? question.topics.split(',').map(t => 
    `<span class="topic-pill">${escapeHtml(t.trim())}</span>`
  ).join('') : '';

  const difficultyClass = `badge-${question.difficulty.toLowerCase()}`;

  card.innerHTML = `
    <div class="question-result-content">
      <h4 class="question-result-title">${escapeHtml(question.title)}</h4>
      
      <div class="question-result-meta">
        <span class="badge badge-difficulty ${difficultyClass}">${question.difficulty}</span>
        <span class="badge badge-status">📌 ${question.status}</span>
      </div>

      <div class="question-result-info">
        <div>📅 Solved: ${formatDate(question.solvedDate)}</div>
      </div>

      ${question.approach ? `
        <div class="question-result-info">
          💡 ${escapeHtml(question.approach)}
        </div>
      ` : ''}

      ${topicTags ? `
        <div class="question-result-topics">${topicTags}</div>
      ` : ''}
    </div>

    <div class="question-result-actions">
      <span class="action-icon ${question.bookmarked ? 'bookmarked' : ''}" 
            onclick="toggleBookmark(${index}, event)" 
            title="Bookmark">⭐</span>
      <button class="btn-view-question" onclick="viewQuestion('${escapeHtml(question.link)}')">
        View →
      </button>
    </div>
  `;

  return card;
}

/**
 * Toggle bookmark for a question
 */
function toggleBookmark(index, event) {
  allQuestions[index].bookmarked = !allQuestions[index].bookmarked;
  localStorage.setItem('leetcodeQuestions', JSON.stringify(allQuestions));
  performSearch(); // Re-render to update icon

  if (event && event.target) {
    event.target.classList.toggle('bookmarked');
  }
}

/**
 * View question (open link)
 */
function viewQuestion(link) {
  if (link && link !== 'undefined') {
    window.open(link, '_blank');
  }
}

/**
 * Reset all filters
 */
function resetFilters() {
  document.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = false;
  });
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.value = '';
  });
  document.getElementById('searchInput').value = '';
  document.getElementById('topicSearch').value = '';
  document.getElementById('tagsSearch').value = '';

  filterTopicsList('');
  filterTagsList('');
  performSearch();
}

/**
 * Format date
 */
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Escape HTML
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

/**
 * Display results on initial load
 */
function displayResults() {
  performSearch();
}
