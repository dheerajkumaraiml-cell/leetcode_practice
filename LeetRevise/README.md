# LeetRevise

Starter scaffold for LeetRevise — a lightweight revision tool inspired by LeetCode, Notion and GitHub.

Tech stack
- Frontend: HTML, CSS, Vanilla JS
- Backend: Google Apps Script (to be deployed)
- Database: Google Sheets

Structure
- index.html, dashboard.html, add-question.html, revision.html, profile.html
- css/, js/, images/

Quick start
1. Open the `LeetRevise` folder in a static server or VS Code Live Server.
2. Edit `js/auth.js` and set `GAS_BASE` to your deployed Apps Script web app URL.
3. Alternatively, edit `js/add-question.js` and set `GOOGLE_APPS_SCRIPT_URL` to your deployed Apps Script web app URL.
4. Deploy a Google Apps Script web app that reads/writes your Google Sheet and expose endpoints (POST accepts question data).

Deployment Guide
- Frontend: deploy the `LeetRevise/` folder to GitHub Pages or Netlify.
  - GitHub Pages: publish the repository or branch containing `LeetRevise` as the site source.
  - Netlify: connect your repo or drag-and-drop the `LeetRevise` folder, and set the publish directory to `LeetRevise/`.
- Backend: create a Google Sheet and attach a Google Apps Script project.
  - Copy the contents of `backend-gas-code.js` into the Apps Script editor.
  - Set your sheet name in `SHEET_NAME` if it is not `Sheet1`.
  - Deploy the script as a Web App with access set to "Anyone, even anonymous" (or your desired auth level).
  - Use the generated web app URL in `js/add-question.js`.
- Database: the Google Sheet is the persistent storage for questions and revision dates.

Verify functionality
1. Open the deployed frontend URL.
2. Submit a question through `Add Question`.
3. Confirm the backend returns success and the row appears in the Google Sheet.
4. Confirm the frontend can access the hosted site and the Google Apps Script endpoint is reachable.

Notes
- This is a starter scaffold. Implement backend endpoints and Sheets integration in Apps Script.
- Designed to be responsive and mobile-friendly with a dark/light theme toggle.
