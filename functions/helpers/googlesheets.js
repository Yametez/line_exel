const {google} = require("googleapis");
const sheets = google.sheets("v4");
const {googleSheetCredential} = require("../config");
const serviceAccount = require("../credential.json");

const getGoogleSheetData = async (sheet, range) => {
  const jwtClient = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const params = {
    auth: jwtClient,
    spreadsheetId: googleSheetCredential.SPREADSHEET_ID,
    range: `${sheet}!${range}`,
  };
  let data = [];
  try {
    data = (await sheets.spreadsheets.values.get(params)).data;
    console.log("data", data);
  } catch (err) {
    console.error("error", err.message);
  }
  return data;
};

const appendGoogleSheetData = async (sheet, range, values) => {
  const jwtClient = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const request = {
    auth: jwtClient,
    spreadsheetId: googleSheetCredential.SPREADSHEET_ID,
    range: `${sheet}!${range}`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: {
      values,
    },
  };

  try {
    await sheets.spreadsheets.values.append(request);
    console.log("Data appended successfully");
  } catch (err) {
    console.error("Error appending data", err.message);
  }
};

module.exports = {getGoogleSheetData, appendGoogleSheetData};
