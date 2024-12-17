// Function to parse values from the sheet
function parseValue(valueStr) {
  // Remove all unwanted characters (like spaces, currency symbols, etc.)
  let cleanStr = valueStr.replace(/[^\d.,]/g, "").trim();

  // If there's ",00" at the end, remove it along with the comma
  cleanStr = cleanStr.replace(/,00$/, "");

  return cleanStr;
}

// Replace with your desired currency
const modificatori = { currency: "RON" };

const colori = {
  header: Color.dynamic(new Color("#343946"), Color.white()),
  testi: Color.dynamic(new Color("#6e7276"), new Color("#ebebeb")),
  refresh: Color.dynamic(new Color("#1d1d1b"), Color.white()),
  bg: Color.dynamic(new Color("#fafafa"), new Color("#191919")),
};

const font = {
  header: new Font("Helvetica Bold", 23),
  testi: new Font("Helvetica Bold", 13.5),
  cifre: new Font("Helvetica Bold", 22),
  refresh: new Font("Helvetica Light", 12),
};

// Get current date, determine Romanian month name and year
const monthNames = [
  "ianuarie",
  "februarie",
  "martie",
  "aprilie",
  "mai",
  "iunie",
  "iulie",
  "august",
  "septembrie",
  "octombrie",
  "noiembrie",
  "decembrie",
];
let currentDate = new Date();
let currentMonthName = monthNames[currentDate.getMonth()];
let currentYear = currentDate.getFullYear();
let currentMonthYear = `${currentMonthName} ${currentYear}`;

// Replace with your actual sheet_id and apiKey
const sheet_id = "YOUR_SHEET_ID";
const apiKey = "YOUR_API_KEY";
const range = "'Monthly Overview'!A1:AA13";

let widget = await createWidget();
Script.setWidget(widget);
Script.complete();

async function createWidget() {
  let w = new ListWidget();
  w.backgroundColor = colori.bg;
  w.respectScreenScale = true;

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${sheet_id}/values/${encodeURIComponent(
    range
  )}?key=${apiKey}`;

  async function loadItems() {
    let req = new Request(endpoint);
    let corpo = await req.loadJSON();
    return corpo.values; // array of arrays
  }

  let json = await loadItems();

  // json[0] should contain headers. The first element in json[0] is "Month", followed by categories and finally "Total Expenditure".
  const headers = json[0];

  // Find the row for current month-year
  const monthIndex = json.findIndex(
    (row) => row[0] && row[0].trim() === currentMonthYear
  );
  if (monthIndex === -1) {
    w.addText(`No data found for ${currentMonthYear}`);
    return w;
  }

  const monthRow = json[monthIndex];

  // Find "Total Expenditure" column index
  const totalExpIndex = headers.indexOf(" Total Expenditure ");
  let totalExpenditureValue = "-";
  if (totalExpIndex !== -1) {
    totalExpenditureValue = monthRow[totalExpIndex] ? monthRow[totalExpIndex].trim() : "-";
  }

  const title = w.addText(`Expenses ${currentMonthYear}`);
  title.font = font.header;
  title.textColor = colori.header;
  w.addSpacer(10);

  // We'll now extract only those categories that have a numeric value for the current month
  let results = [];
  // We skip the first column (Month) and the last column (Total Expenditure) while extracting categories
  for (let i = 1; i < headers.length; i++) {
    if (i === totalExpIndex) continue; // skip the total column
    let category = headers[i].trim();
    let valueStr = monthRow[i] ? monthRow[i].trim() : "-";

    if (valueStr !== "-" && valueStr.length > 0) {
      let numberVal = parseValue(valueStr);
      if (numberVal !== null && numberVal > 0) {
        // We have a valid value
        results.push({ category: category, value: numberVal });
      }
    }
  }

  if (totalExpenditureValue === "-" || totalExpenditureValue.length === 0) {
    w.addText(`No total expenditure data found for ${currentMonthYear}`);
  } else {
    // Parse the total expenditure value
    let parsedTotal = parseValue(totalExpenditureValue);
   // console.log(parsedTotal)
    if (parsedTotal === null) {
      w.addText(`Invalid total expenditure data for ${currentMonthYear}`);
    } else {
      // Display the total expenditure from the sheet
      let totalLine = w.addText(
        `Total: ${parsedTotal} ${modificatori.currency}`
      );
      totalLine.font = font.testi;
      totalLine.textColor = colori.testi;
      totalLine.centerAlignText()
      w.addSpacer(5);
    }
  }

  if (results.length === 0) {
    w.addText(`No expenditures found for ${currentMonthYear}`);
  } else {
    // Now display the categories
    for (let item of results) {
      let line = w.addText(
        `${item.category} - ${item.value} ${modificatori.currency}`
      );
      line.font = font.testi;
      line.textColor = colori.testi;
      w.addSpacer(3);
    }
  }

  // Footer: widget last update
  w.addSpacer();
  const l1 = w.addText(`Last fetched on: ${new Date().toLocaleString()}`);
  l1.font = font.refresh;
  l1.textColor = colori.refresh;
  l1.textOpacity = 0.9;
  l1.centerAlignText();
  
  // Set widget refresh interval hint (5 hours)
  var refreshDate = Date.now() + 1000 * 60 * 180; // 5 hours
  w.refreshAfterDate = new Date(refreshDate);

  return w;
}
