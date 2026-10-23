# THE TORCHES WIND — Google Sheets save setup

Every book/season has its own save, while all books use the same Google spreadsheet:

https://docs.google.com/spreadsheets/d/1we4udRf2CZPz2KH3vVT6gp6xQ7ZUdil96Ev-l3Ziv6w/edit

Each browser saves locally automatically. When Google Sheets is connected, the reader also sends saves to the shared spreadsheet. If the spreadsheet or connection is unreachable, the latest local save remains available and the reader continues using it.

## One-time setup

1. Open [Google Apps Script](https://script.google.com/home/start) while signed into the Google account that can edit the spreadsheet above.
2. Open the `Code.gs` file in this folder and copy its entire contents into the Apps Script editor, replacing the starter code.
3. Save the project.
4. Select `setup` and click **Run**. Approve the requested Google Sheets permissions. This creates or prepares the `Reader Saves` tab in the spreadsheet.
5. Click **Deploy → New deployment** and choose **Web app**.
6. Set **Execute as** to **Me**. Set access to **Anyone** if the public GitHub Pages reader should sync without requiring every reader to sign into Google. Anyone with the web-app URL can send requests, so use this only for non-sensitive reading data.
7. Click **Deploy**, authorize if prompted, and copy the web-app URL ending in `/exec`.
8. Open each book, go to its reading-settings page, paste the web-app URL into **Google Apps Script Web App URL**, then click **Save connection & sync**.

## Separate saves for each season

The reader sends a stable `bookId` with every save. The spreadsheet stores one row per combination of `readerId` and `bookId`, so seasons do not overwrite one another. When adding another book, give it a unique `BOOK_ID` in its HTML file, and use the same spreadsheet and Apps Script deployment.

The reader saves the current page, marked word, reading settings, and timestamp. Local storage is updated first, so it continues to work offline. Cloud loading compares timestamps and uses the newer save when available.

## Sync between devices

Use **Copy ID** in the reader and enter that same Reader ID on your other device. Keep the same web-app URL on both devices. A new browser/device otherwise receives its own Reader ID. Each season still has its own separate save under that shared Reader ID.

If you edit `Code.gs` after deployment, use **Deploy → Manage deployments → Edit** and deploy a new version.
