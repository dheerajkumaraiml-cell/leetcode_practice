/* Global UI interactions: theme toggle and sidebar */
document.addEventListener('DOMContentLoaded', () => {
  const themeBtn = document.getElementById('themeBtn') || document.getElementById('themeBtn2') || document.getElementById('themeBtn3') || document.getElementById('themeBtn4') || document.getElementById('themeBtn5') || document.getElementById('themeBtn6')
  const menuBtns = document.querySelectorAll('#menuBtn, #menuBtn2, #menuBtn3, #menuBtn4, #menuBtn5, #menuBtn6')
  const sidebar = document.getElementById('sidebar')

  // Theme
  const current = localStorage.getItem('lr-theme') || (document.body.classList.contains('light') ? 'light' : 'dark')
  if (current === 'light') document.body.classList.add('light')

  if (themeBtn) themeBtn.addEventListener('click', toggleTheme)

  function toggleTheme(){
    document.body.classList.toggle('light')
    localStorage.setItem('lr-theme', document.body.classList.contains('light') ? 'light' : 'dark')
  }

  // Menu toggle for mobile
  menuBtns.forEach(btn => btn && btn.addEventListener('click', () => {
    if (!sidebar) return
    sidebar.classList.toggle('open')
  }))

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (!sidebar) return
    const target = e.target
    if (window.innerWidth <= 900 && sidebar.classList.contains('open') && !sidebar.contains(target) && !target.closest('.hamburger')){
      sidebar.classList.remove('open')
    }
  })

  initializeNotificationSystem()
})

/**
 * Initialize browser notifications for daily revision reminders.
 */
function initializeNotificationSystem() {
  if (!('Notification' in window)) {
    return
  }

  const permission = Notification.permission
  if (permission === 'granted') {
    sendRevisionReminderIfNeeded()
  } else if (permission !== 'denied') {
    Notification.requestPermission().then(result => {
      if (result === 'granted') {
        sendRevisionReminderIfNeeded()
      }
    })
  }
}

/**
 * Send a daily notification if there are revisions due today.
 */
function sendRevisionReminderIfNeeded() {
  const today = new Date().toISOString().split('T')[0]
  const lastNotificationDate = localStorage.getItem('lr-lastRevisionNotificationDate')

  if (lastNotificationDate === today) {
    return
  }

  const revisionCount = countRevisionsDueToday()
  if (revisionCount === 0) {
    return
  }

  new Notification('LeetRevise Reminder', {
    body: `You have ${revisionCount} LeetCode revisions today.`,
    icon: 'images/notification-icon.png'
  })

  localStorage.setItem('lr-lastRevisionNotificationDate', today)
}

/**
 * Count questions with revision due dates matching today.
 * @returns {number}
 */
function countRevisionsDueToday() {
  const stored = localStorage.getItem('leetcodeQuestions')
  if (!stored) {
    return 0
  }

  try {
    const questions = JSON.parse(stored)
    const today = new Date().toISOString().split('T')[0]
    return questions.reduce((count, q) => {
      if (q.revision2 === today || q.revision5 === today || q.revision15 === today || q.revision30 === today || q.revision45 === today || q.revision60 === today) {
        return count + 1
      }
      return count
    }, 0)
  } catch (error) {
    console.error('Revision count parse error:', error)
    return 0
  }
}
