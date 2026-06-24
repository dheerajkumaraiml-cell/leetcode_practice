// LeetReviseDB - Google Apps Script Backend
// Updated to handle revision dates

// Configuration
const SHEET_NAME = "Sheet1"; // Change if needed
const HEADERS = [
  "Title", "Link", "Difficulty", "Topics", "Approach", "Solution", 
  "Notes", "Mistakes", "SolvedDate", "Revision2", "Revision5", 
  "Revision15", "Revision30", "Revision45", "Revision60", "Status"
];

/**
 * Main POST handler - Receives JSON data from website
 */
function doPost(e) {
  try {
    // Parse incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Check if this is a revision action update
    if (data.type === 'updateRevisionAction') {
      return handleRevisionAction(data);
    }

    // Otherwise, treat as new question submission
    // Validate required fields
    if (!data.title || !data.difficulty) {
      return createResponse(false, "Missing required fields: title and difficulty", 400);
    }

    // Add data to sheet
    const result = addQuestionToSheet(data);
    
    if (result.success) {
      return createResponse(true, "Question added successfully with revision dates", 200, {
        rowNumber: result.rowNumber,
        timestamp: new Date().toISOString(),
        revisionDates: {
          revision2: data.revision2,
          revision5: data.revision5,
          revision15: data.revision15,
          revision30: data.revision30,
          revision45: data.revision45,
          revision60: data.revision60
        }
      });
    } else {
      return createResponse(false, result.error, 400);
    }

  } catch (error) {
    Logger.log("Error in doPost: " + error);
    return createResponse(false, "Server error: " + error.toString(), 500);
  }
}

/**
 * GET handler - For testing and CORS preflight
 */
function doGet(e) {
  const action = e.parameter && e.parameter.action;

  if (action === 'getQuestions') {
    const questions = getAllQuestions();
    return createResponse(true, 'Fetched questions from Google Sheet', 200, {
      questions: questions
    });
  }

  return createResponse(true, "LeetReviseDB API is running", 200, {
    version: "1.0",
    endpoint: "Use POST to submit question data or GET?action=getQuestions to read questions",
    revisionDates: "Automatically calculated on frontend"
  });
}

/**
 * Add question data to Google Sheet
 */
function addQuestionToSheet(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Initialize sheet with headers if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      formatHeaderRow(sheet);
    }

    // Prepare row data in correct order matching HEADERS
    const rowData = [
      data.title || "",
      data.link || "",
      data.difficulty || "",
      data.topics || "",
      data.approach || "",
      data.solution || "",
      data.notes || "",
      data.mistakes || "",
      data.solvedDate || new Date().toISOString().split('T')[0],
      data.revision2 || "",           // +2 days
      data.revision5 || "",           // +5 days
      data.revision15 || "",          // +15 days
      data.revision30 || "",          // +30 days
      data.revision45 || "",          // +45 days
      data.revision60 || "",          // +60 days
      data.status || "Solved"
    ];

    // Verify data length matches headers
    if (rowData.length !== HEADERS.length) {
      throw new Error("Data mismatch: " + rowData.length + " fields vs " + HEADERS.length + " headers");
    }

    // Append row to sheet
    sheet.appendRow(rowData);
    
    // Get the row number that was just added
    const rowNumber = sheet.getLastRow();

    // Add formatting to new row
    formatNewRow(sheet, rowNumber);

    Logger.log("Question added at row: " + rowNumber);
    Logger.log("Revision dates stored: " + JSON.stringify({
      revision2: data.revision2,
      revision5: data.revision5,
      revision15: data.revision15,
      revision30: data.revision30,
      revision45: data.revision45,
      revision60: data.revision60
    }));

    return {
      success: true,
      rowNumber: rowNumber,
      data: rowData
    };

  } catch (error) {
    Logger.log("Error adding to sheet: " + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Format header row
 */
function formatHeaderRow(sheet) {
  try {
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#7c3aed");
    headerRange.setFontColor("white");
    headerRange.setHorizontalAlignment("center");
    
    // Auto-size columns
    for (let i = 1; i <= HEADERS.length; i++) {
      sheet.autoResizeColumn(i);
    }
  } catch (error) {
    Logger.log("Header formatting error: " + error);
  }
}

/**
 * Format newly added row
 */
function formatNewRow(sheet, rowNumber) {
  try {
    const range = sheet.getRange(rowNumber, 1, 1, HEADERS.length);
    
    // Alternating row colors for readability
    if (rowNumber % 2 === 0) {
      range.setBackground("rgba(124, 58, 237, 0.05)");
    }
    
    // Auto-size columns for better visibility
    for (let i = 1; i <= HEADERS.length; i++) {
      sheet.autoResizeColumn(i);
    }

  } catch (error) {
    Logger.log("Formatting error (non-critical): " + error);
  }
}

/**
 * Create standardized API response with CORS headers
 */
function createResponse(success, message, statusCode, data = null) {
  const payload = {
    success: success,
    message: message,
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };

  if (data) {
    payload.data = data;
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    .setHeader("Access-Control-Max-Age", "86400");
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doOptions(e) {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    .setHeader("Access-Control-Max-Age", "86400");
}

/**
 * Initialize sheet headers if not present
 */
function initializeSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    formatHeaderRow(sheet);
  }
}

/**
 * Get all questions from sheet (optional - for dashboard)
 */
function getAllQuestions() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return [];
    }

    // Convert to objects
    const questions = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      questions.push({
        title: row[0],
        link: row[1],
        difficulty: row[2],
        topics: row[3],
        approach: row[4],
        solution: row[5],
        notes: row[6],
        mistakes: row[7],
        solvedDate: row[8],
        revision2: row[9],
        revision5: row[10],
        revision15: row[11],
        revision30: row[12],
        revision45: row[13],
        revision60: row[14],
        status: row[15]
      });
    }

    return questions;
  } catch (error) {
    Logger.log("Error getting all questions: " + error);
    return [];
  }
}

/**
 * Handle revision action (easy, difficult, skip)
 */
function handleRevisionAction(data) {
  try {
    Logger.log("Processing revision action: " + data.action + " for: " + data.title);

    const sheet = SpreadsheetApp.getActiveSheet();
    const sheetData = sheet.getDataRange().getValues();

    // Find the row with this question
    let targetRow = -1;
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] === data.title) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return createResponse(false, "Question not found: " + data.title, 404);
    }

    const row = sheetData[targetRow - 1];

    // Process action
    if (data.action === 'easy') {
      // Mark easy - keep normal schedule, add review log
      addRevisionLog(sheet, data.title, 'easy', row[8]);
      return createResponse(true, "Question marked as easy", 200, {
        action: 'easy',
        rowUpdated: targetRow
      });
    } 
    else if (data.action === 'difficult') {
      // Still difficult - add new revision date 2 days from now
      addRevisionLog(sheet, data.title, 'difficult', row[8]);
      updateRevisionDate(sheet, targetRow, data.newRevisionDate, true);
      return createResponse(true, "New revision scheduled for: " + data.newRevisionDate, 200, {
        action: 'difficult',
        newRevisionDate: data.newRevisionDate,
        rowUpdated: targetRow
      });
    }
    else if (data.action === 'skip') {
      // Skip - move all revisions to tomorrow
      addRevisionLog(sheet, data.title, 'skip', row[8]);
      shiftRevisionDates(sheet, targetRow, 1);
      return createResponse(true, "Revision dates shifted to tomorrow", 200, {
        action: 'skip',
        rowUpdated: targetRow
      });
    }

    return createResponse(false, "Unknown action: " + data.action, 400);

  } catch (error) {
    Logger.log("Error in handleRevisionAction: " + error);
    return createResponse(false, "Server error: " + error.toString(), 500);
  }
}

/**
 * Shift all revision dates forward by N days
 */
function shiftRevisionDates(sheet, rowNumber, days) {
  try {
    const revisionColumns = [9, 10, 11, 12, 13, 14]; // revision2 through revision60
    
    revisionColumns.forEach(col => {
      const cell = sheet.getRange(rowNumber, col);
      const value = cell.getValue();
      
      if (value && value !== '') {
        const date = new Date(value + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          date.setDate(date.getDate() + days);
          const newDate = date.toISOString().split('T')[0];
          cell.setValue(newDate);
          Logger.log("Shifted revision date: " + value + " -> " + newDate);
        }
      }
    });

  } catch (error) {
    Logger.log("Error shifting revision dates: " + error);
  }
}

/**
 * Update a specific revision date
 */
function updateRevisionDate(sheet, rowNumber, newDate, addNew = false) {
  try {
    if (addNew) {
      // Add as an additional note for now (in future could add new column)
      const notesCol = 7;
      const cell = sheet.getRange(rowNumber, notesCol);
      const currentNotes = cell.getValue();
      const newNotes = (currentNotes ? currentNotes + '\n' : '') + 
                       'Additional revision scheduled for: ' + newDate;
      cell.setValue(newNotes);
      Logger.log("Added additional revision date to notes: " + newDate);
    }

  } catch (error) {
    Logger.log("Error updating revision date: " + error);
  }
}

/**
 * Add revision log entry
 */
function addRevisionLog(sheet, title, action, solvedDate) {
  try {
    // Create or append to a revision log sheet
    const logSheetName = "Revision_Log";
    let logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(logSheetName);

    // Create sheet if it doesn't exist
    if (!logSheet) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      logSheet = ss.insertSheet(logSheetName);
      logSheet.appendRow(["Question", "Action", "Date", "Time", "Solved Date"]);
    }

    // Add log entry
    const now = new Date();
    logSheet.appendRow([
      title,
      action,
      now.toISOString().split('T')[0],
      now.toLocaleTimeString(),
      solvedDate
    ]);

    Logger.log("Added revision log: " + action + " - " + title);

  } catch (error) {
    Logger.log("Error adding revision log: " + error);
  }
}
