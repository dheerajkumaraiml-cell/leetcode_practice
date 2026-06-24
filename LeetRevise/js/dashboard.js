document.addEventListener('DOMContentLoaded', () => {
  // Initialize charts
  initializeDashboard()
})

function initializeDashboard() {
  populateStatCards()
  renderAchievements()
  initializeCharts()
  generateHeatmap()
}

// ==================== Stat Cards ====================
function populateStatCards() {
  const grid = document.getElementById('dashboardGrid')
  if (!grid) return

  // Get data from localStorage or use defaults
  const stats = getStatsData()

  const cards = [
    {
      label: 'Questions Solved Today',
      value: stats.solvedToday,
      icon: '📝',
      action: 'todaySolved'
    },
    {
      label: 'Total Solved',
      value: stats.totalSolved,
      icon: '✓',
      action: 'openQuestions'
    },
    {
      label: 'Revision Due Today',
      value: stats.revisionDueToday,
      icon: '🔄',
      action: 'revision'
    },
    {
      label: 'Current Streak',
      value: `${stats.currentStreak} days`,
      icon: '🔥',
      action: 'streak'
    },
    {
      label: 'Easy',
      value: stats.easyCount,
      icon: '🟢',
      action: 'difficultyEasy'
    },
    {
      label: 'Medium',
      value: stats.mediumCount,
      icon: '🟡',
      action: 'difficultyMedium'
    },
    {
      label: 'Hard',
      value: stats.hardCount,
      icon: '🔴',
      action: 'difficultyHard'
    },
    {
      label: 'Total Streak',
      value: `${stats.longestStreak} days`,
      icon: '⭐',
      action: 'totalStreak'
    }
  ]

  cards.forEach(card => {
    const element = document.createElement('div')
    element.className = 'stat-card'

    if (card.action) {
      element.classList.add('clickable')
      element.setAttribute('role', 'button')
      element.title = `Click to view ${card.label}`
      element.addEventListener('click', () => handleDashboardCardClick(card.action))
    }

    element.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 8px;">${card.icon}</div>
      <div class="stat-value">${card.value}</div>
      <div class="stat-label">${card.label}</div>
    `
    grid.appendChild(element)
  })
}

function handleDashboardCardClick(action) {
  const today = new Date()
  const todayKey = today.toISOString().split('T')[0]

  switch (action) {
    case 'todaySolved':
      window.location.href = `search.html?status=Solved&dateFrom=${todayKey}&dateTo=${todayKey}`
      break
    case 'openQuestions':
      window.location.href = 'search.html?status=Solved'
      break
    case 'revision':
      window.location.href = 'revision.html'
      break
    case 'streak': {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)
      const fromKey = thirtyDaysAgo.toISOString().split('T')[0]
      window.location.href = `search.html?status=Solved&dateFrom=${fromKey}&dateTo=${todayKey}`
      break
    }
    case 'difficultyEasy':
      window.location.href = 'search.html?difficulty=Easy'
      break
    case 'difficultyMedium':
      window.location.href = 'search.html?difficulty=Medium'
      break
    case 'difficultyHard':
      window.location.href = 'search.html?difficulty=Hard'
      break
    case 'totalStreak':
      window.location.href = 'search.html?status=Solved'
      break
    default:
      window.location.href = 'search.html'
  }
}

function getStatsData() {
  const storedQuestions = localStorage.getItem('leetcodeQuestions')

  if (storedQuestions) {
    try {
      const questions = JSON.parse(storedQuestions)
      if (Array.isArray(questions) && questions.length > 0) {
        return deriveProgressStats(deriveStatsFromQuestions(questions))
      }
    } catch (error) {
      console.error('Error parsing saved questions:', error)
    }
  }

  const baseStats = {
    solvedToday: 3,
    totalSolved: 156,
    revisionDueToday: 5,
    currentStreak: 12,
    easyCount: 52,
    mediumCount: 78,
    hardCount: 26,
    longestStreak: 45,
    weeklyData: [5, 8, 6, 12, 10, 9, 15],
    topicData: {
      'Array': 28,
      'String': 22,
      'DP': 18,
      'Tree': 25,
      'Graph': 20,
      'Other': 23
    },
    revisionData: [12, 14, 11, 15, 16, 14, 18],
    dailyActivity: generateSampleActivity()
  }

  return deriveProgressStats(baseStats)
}

function deriveStatsFromQuestions(questions) {
  const today = new Date().toISOString().split('T')[0]
  const solvedQuestions = questions.filter(q => q.status?.toLowerCase() === 'solved' || q.solvedDate)
  const solvedToday = solvedQuestions.filter(q => normalizeDate(q.solvedDate) === today).length
  const totalSolved = solvedQuestions.length
  const easyCount = questions.filter(q => q.difficulty === 'Easy').length
  const mediumCount = questions.filter(q => q.difficulty === 'Medium').length
  const hardCount = questions.filter(q => q.difficulty === 'Hard').length
  const revisionDueToday = questions.reduce((count, q) => {
    const revisionDates = [q.revision2, q.revision5, q.revision15, q.revision30, q.revision45, q.revision60]
    if (revisionDates.some(date => normalizeDate(date) === today)) {
      return count + 1
    }
    return count
  }, 0)

  const solvedDates = [...new Set(solvedQuestions.map(q => normalizeDate(q.solvedDate)).filter(Boolean))]

  return {
    solvedToday,
    totalSolved,
    revisionDueToday,
    currentStreak: calculateCurrentStreak(solvedDates),
    easyCount,
    mediumCount,
    hardCount,
    longestStreak: calculateLongestStreak(solvedDates),
    weeklyData: buildWeeklyData(questions),
    topicData: buildTopicData(questions),
    revisionData: buildRevisionData(questions),
    dailyActivity: buildDailyActivity(questions)
  }
}

function normalizeDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().split('T')[0]
}

function calculateCurrentStreak(dateStrings) {
  const today = new Date().toISOString().split('T')[0]
  const dateSet = new Set(dateStrings.filter(Boolean))
  let streak = 0
  let current = new Date(today)

  while (dateSet.has(current.toISOString().split('T')[0])) {
    streak += 1
    current.setDate(current.getDate() - 1)
  }

  return streak
}

function calculateLongestStreak(dateStrings) {
  const uniqueDates = [...new Set(dateStrings.filter(Boolean))].sort()
  const dateSet = new Set(uniqueDates)
  let longest = 0

  uniqueDates.forEach(dateStr => {
    const date = new Date(dateStr + 'T00:00:00')
    const previous = new Date(date)
    previous.setDate(previous.getDate() - 1)
    const prevKey = previous.toISOString().split('T')[0]

    if (!dateSet.has(prevKey)) {
      let length = 1
      let next = new Date(date)
      next.setDate(next.getDate() + 1)

      while (dateSet.has(next.toISOString().split('T')[0])) {
        length += 1
        next.setDate(next.getDate() + 1)
      }

      longest = Math.max(longest, length)
    }
  })

  return longest
}

function buildWeeklyData(questions) {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))

  const dateCounts = questions.reduce((counts, q) => {
    const solvedDate = normalizeDate(q.solvedDate)
    if (solvedDate) {
      counts[solvedDate] = (counts[solvedDate] || 0) + 1
    }
    return counts
  }, {})

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const key = date.toISOString().split('T')[0]
    return dateCounts[key] || 0
  })
}

function buildTopicData(questions) {
  const topicCounts = questions.reduce((acc, q) => {
    if (!q.topics) return acc
    q.topics.split(',').forEach(topic => {
      const trimmed = topic.trim()
      if (!trimmed) return
      acc[trimmed] = (acc[trimmed] || 0) + 1
    })
    return acc
  }, {})

  if (Object.keys(topicCounts).length === 0) {
    return {
      'Array': 28,
      'String': 22,
      'DP': 18,
      'Tree': 25,
      'Graph': 20,
      'Other': 23
    }
  }

  return topicCounts
}

function buildRevisionData(questions) {
  const today = new Date()
  const next7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    return date.toISOString().split('T')[0]
  })

  return next7Days.map(dateKey => {
    return questions.reduce((count, q) => {
      const revisionDates = [q.revision2, q.revision5, q.revision15, q.revision30, q.revision45, q.revision60]
      return revisionDates.some(date => normalizeDate(date) === dateKey) ? count + 1 : count
    }, 0)
  })
}

function buildDailyActivity(questions) {
  const activity = {}
  questions.forEach(q => {
    const solvedDate = normalizeDate(q.solvedDate)
    if (!solvedDate) return
    activity[solvedDate] = (activity[solvedDate] || 0) + 1
  })

  if (Object.keys(activity).length === 0) {
    return generateSampleActivity()
  }

  return activity
}

function deriveProgressStats(stats) {
  const xp = stats.xp ?? calculateXp(stats)
  const level = calculateLevel(xp)
  const levelThreshold = level * 250
  const previousThreshold = (level - 1) * 250
  const levelProgress = previousThreshold >= levelThreshold
    ? 100
    : Math.round(((xp - previousThreshold) / (levelThreshold - previousThreshold)) * 100)
  const nextLevelXp = Math.max(0, levelThreshold - xp)

  return {
    ...stats,
    xp,
    level,
    levelProgress,
    nextLevelXp,
    badges: buildBadges(stats)
  }
}

function calculateXp(stats) {
  const baseSolvedXp = (stats.totalSolved || 0) * 10
  const streakXp = (stats.currentStreak || 0) * 20
  const longestStreakXp = (stats.longestStreak || 0) * 5
  const revisionXp = (stats.revisionDueToday || 0) * 15
  const difficultyXp = ((stats.easyCount || 0) * 2) + ((stats.mediumCount || 0) * 4) + ((stats.hardCount || 0) * 8)

  return baseSolvedXp + streakXp + longestStreakXp + revisionXp + difficultyXp
}

function calculateLevel(xp) {
  return Math.max(1, Math.floor(xp / 250) + 1)
}

function buildBadges(stats) {
  return [
    {
      name: '7-day streak',
      description: 'Keep your streak alive for one week',
      earned: (stats.currentStreak || 0) >= 7 || (stats.longestStreak || 0) >= 7
    },
    {
      name: '30-day streak',
      description: 'Maintain momentum for thirty days',
      earned: (stats.longestStreak || 0) >= 30
    },
    {
      name: '100 solved',
      description: 'Solve at least 100 problems',
      earned: (stats.totalSolved || 0) >= 100
    },
    {
      name: 'Revision King',
      description: 'Have 5 or more revisions due today',
      earned: (stats.revisionDueToday || 0) >= 5
    }
  ]
}

function renderAchievements() {
  const stats = getStatsData()
  const levelCard = document.getElementById('levelCard')
  const badgeGrid = document.getElementById('badgeGrid')
  if (!levelCard || !badgeGrid) return

  levelCard.innerHTML = `
    <div class="level-summary">
      <div class="level-name">Level ${stats.level}</div>
      <div class="level-xp">${stats.xp} XP</div>
      <div class="level-meta">${stats.nextLevelXp} XP to next level</div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${stats.levelProgress}%"></div>
    </div>
  `

  badgeGrid.innerHTML = ''
  stats.badges.forEach(badge => {
    const badgeCard = document.createElement('div')
    badgeCard.className = `badge-card ${badge.earned ? 'earned' : 'locked'}`
    badgeCard.innerHTML = `
      <div class="badge-name">${badge.name}</div>
      <div class="badge-desc">${badge.description}</div>
      <div class="badge-status">${badge.earned ? 'Earned' : 'Locked'}</div>
    `
    badgeGrid.appendChild(badgeCard)
  })
}

function generateSampleActivity() {
  // Generate 365 days of sample data
  const activity = {}
  const today = new Date()

  for (let i = 365; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const key = date.toISOString().split('T')[0]

    // Random activity level (0-4)
    activity[key] = Math.floor(Math.random() * 5)
  }

  return activity
}

// ==================== Charts ====================
const chartInstances = {}

function initializeCharts() {
  const stats = getStatsData()

  initWeeklyChart(stats.weeklyData)
  initTopicChart(stats.topicData)
  initRevisionChart(stats.revisionData)
}

function initWeeklyChart(data) {
  const ctx = document.getElementById('weeklyChart')
  if (!ctx) return

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  chartInstances.weekly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Problems Solved',
        data: data,
        backgroundColor: [
          'rgba(124, 58, 237, 0.7)',
          'rgba(124, 58, 237, 0.7)',
          'rgba(124, 58, 237, 0.7)',
          'rgba(124, 58, 237, 0.9)',
          'rgba(124, 58, 237, 0.7)',
          'rgba(124, 58, 237, 0.7)',
          'rgba(124, 58, 237, 0.8)'
        ],
        borderColor: 'rgba(124, 58, 237, 1)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: 'rgba(148, 163, 184, 0.7)'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(148, 163, 184, 0.7)'
          }
        }
      }
    }
  })
}

function initTopicChart(topicData) {
  const ctx = document.getElementById('topicChart')
  if (!ctx) return

  const topics = Object.keys(topicData)
  const values = Object.values(topicData)
  const colors = [
    'rgba(124, 58, 237, 0.8)',
    'rgba(37, 99, 235, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(196, 181, 253, 0.6)'
  ]

  chartInstances.topic = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: topics,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: 'rgba(15, 23, 36, 0.8)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: 'rgba(230, 238, 248, 0.8)',
            padding: 12,
            font: {
              size: 12
            }
          }
        }
      }
    }
  })
}

function initRevisionChart(data) {
  const ctx = document.getElementById('revisionChart')
  if (!ctx) return

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  chartInstances.revision = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Revisions Completed',
        data: data,
        borderColor: 'rgba(124, 58, 237, 1)',
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(124, 58, 237, 0.8)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: 'rgba(230, 238, 248, 0.8)'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: 'rgba(148, 163, 184, 0.7)'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(148, 163, 184, 0.7)'
          }
        }
      }
    }
  })
}

// ==================== GitHub-style Heatmap ====================
function generateHeatmap() {
  const container = document.getElementById('heatmapContainer')
  if (!container) return

  const stats = getStatsData()
  const activity = stats.dailyActivity

  // Create wrapper
  const wrapper = document.createElement('div')
  wrapper.className = 'heatmap-wrapper'

  const today = new Date()
  const weeks = {}

  // Group activity by week
  for (const dateStr in activity) {
    const date = new Date(dateStr + 'T00:00:00')
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]

    if (!weeks[weekKey]) {
      weeks[weekKey] = []
    }
    weeks[weekKey].push({
      date: dateStr,
      level: activity[dateStr]
    })
  }

  // Sort weeks
  const sortedWeeks = Object.keys(weeks).sort()

  // Create heatmap grid
  sortedWeeks.forEach((weekKey, weekIndex) => {
    const monthDiv = document.createElement('div')
    monthDiv.className = 'heatmap-month'

    const week = weeks[weekKey]

    // Fill in missing days at the start
    const firstDate = new Date(week[0].date + 'T00:00:00')
    const dayOfWeek = firstDate.getDay()

    for (let i = 0; i < dayOfWeek; i++) {
      const emptyDay = document.createElement('div')
      emptyDay.className = 'heatmap-day'
      emptyDay.style.opacity = '0'
      monthDiv.appendChild(emptyDay)
    }

    // Add days of the week
    week.forEach(item => {
      const day = document.createElement('div')
      day.className = `heatmap-day heatmap-level-${item.level}`
      day.title = `${item.date}: ${item.level} problems solved`
      day.setAttribute('data-date', item.date)
      day.setAttribute('data-level', item.level)

      day.addEventListener('mouseover', function() {
        day.title = `${item.date}: ${item.level} problems solved`
      })

      monthDiv.appendChild(day)
    })

    wrapper.appendChild(monthDiv)
  })

  container.innerHTML = ''
  container.appendChild(wrapper)

  // Add legend
  const legend = document.createElement('div')
  legend.className = 'heatmap-legend'
  legend.innerHTML = `
    <span>Less</span>
    <div class="heatmap-legend-item">
      <div class="heatmap-legend-box heatmap-level-0"></div>
    </div>
    <div class="heatmap-legend-item">
      <div class="heatmap-legend-box heatmap-level-1"></div>
    </div>
    <div class="heatmap-legend-item">
      <div class="heatmap-legend-box heatmap-level-2"></div>
    </div>
    <div class="heatmap-legend-item">
      <div class="heatmap-legend-box heatmap-level-3"></div>
    </div>
    <div class="heatmap-legend-item">
      <div class="heatmap-legend-box heatmap-level-4"></div>
    </div>
    <span>More</span>
  `

  container.appendChild(legend)
}
