export const GOOGLE_SHEETS_SERVICE_ID = "university_timetable_sheets_service";

const SPREADSHEET_TITLE = "University Timetable Data";

// Helper to determine if we need to create the file
export const findOrCreateSpreadsheet = async (accessToken: string): Promise<string> => {
    // 1. Search for existing file
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    // 2. Create if not exists
    const createUrl = "https://www.googleapis.com/drive/v3/files";
    const createRes = await fetch(createUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: SPREADSHEET_TITLE,
            mimeType: "application/vnd.google-apps.spreadsheet",
        }),
    });
    const createData = await createRes.json();
    const spreadsheetId = createData.id;

    // 3. Initialize Sheets (Tabs)
    // We need to add the sheets. The default one is usually "Sheet1".
    // We'll rename Sheet1 to Courses and add the others.
    const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

    const requests = [
        {
            updateSheetProperties: {
                properties: { sheetId: 0, title: "Courses" }, // Rename default
                fields: "title",
            },
        },
        { addSheet: { properties: { title: "Faculty" } } },
        { addSheet: { properties: { title: "Rooms" } } },
        { addSheet: { properties: { title: "Allotments" } } },
        { addSheet: { properties: { title: "Departments" } } },
        { addSheet: { properties: { title: "Schemas" } } },
    ];

    await fetch(batchUpdateUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
    });

    return spreadsheetId;
};

// Generic Fetch
export const fetchSheetData = async (accessToken: string, spreadsheetId: string, range: string) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return data.values || [];
};

// Generic Replace (Clear + Write)
export const replaceSheetData = async (accessToken: string, spreadsheetId: string, range: string, values: any[][]) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`;

    // Convert all values to strings to be safe, or let JSON.stringify handle primitives
    const body = {
        range,
        majorDimension: "ROWS",
        values,
    };

    await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
};
