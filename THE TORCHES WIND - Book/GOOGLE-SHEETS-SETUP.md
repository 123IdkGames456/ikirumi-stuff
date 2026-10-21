# THE TORCHES WIND — Google Sheets save setup

The reader now saves reading progress locally and can sync the current page, marked word, bookmarks, reading notes, font size, and theme to the Google spreadsheet.

## One-time setup

1. Open [Google Apps Script](https://script.google.com/home/start) while signed into the Google account that can edit the target spreadsheet.
2. Open `Code.gs` in this repository and copy its entire contents into the Apps Script editor, replacing the starter code.
3. Save the project.
4. Select the function `setup` and click **Run**. Approve the requested Google Sheets permissions. This creates a `Reader Saves` tab in the spreadsheet.
5. Click **Deploy → New deployment**.
6. Choose **Web app** as the deployment type.
7. Set **Execute as** to **Me**. Set access to **Anyone** if you want the public GitHub Pages reader to sync without every reader signing into Google. This means anyone who obtains the web-app URL may send requests to it; use it only for non-sensitive reading data.
8. Click **Deploy**, authorize if prompted, and copy the web-app URL ending in `/exec`.
9. Open the book, choose **Connect Google Sheets sync**, paste the URL, and choose **Save connection & sync**.

## What is saved

The `Reader Saves` tab keeps one row per browser reader ID. It stores the current page, page title, marked word data, bookmarked pages, page notes, text size, night mode, update time, and a JSON copy of the state.

Local browser saving works even before Google Sheets is connected. To sync between devices, use the same reader ID; this build generates one per browser, so a fresh browser/device has a different ID unless you copy its local reader ID into that device. Do not put passwords or sensitive personal information in page notes.

If you change the Apps Script code after deployment, use **Deploy → Manage deployments → Edit** and deploy a new version.
