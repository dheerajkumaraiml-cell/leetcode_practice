// Placeholder for Google Apps Script / Sheets integration
// Implement REST calls to your deployed Apps Script web app

const GAS_BASE = '' // set to your Apps Script web app URL

export async function fetchSheet(path = '', opts = {}){
  if (!GAS_BASE) return Promise.reject(new Error('GAS_BASE not configured'))
  const res = await fetch(GAS_BASE + path, opts)
  return res.json()
}

// Example: export function to add a question
export async function addQuestion(question){
  return fetchSheet('?action=addQuestion', {method:'POST', body: JSON.stringify(question)})
}
