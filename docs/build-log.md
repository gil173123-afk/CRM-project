# CRM Build Log

## CRM 1 — Contact Starter

### Implemented
- Added a responsive sidebar menu for Dashboard, Contacts, Memberships, Donations, Tasks, Reports, and Settings.
- Added a Node.js HTTP server and JSON-backed contact API.
- Added five sample contacts.
- Added case-insensitive search across contact name, organization, email, and phone.
- Added server-side validation that rejects blank or whitespace-only contact names.
- Added automated tests using Node's built-in test runner.
- Kept the application dependency-free for easier setup.

### Improvement
Search is case-insensitive and checks multiple contact fields, rather than requiring an exact name match. Server-side validation also protects the data if a request bypasses the browser form.

### Run locally
- Requires Node.js 20 or newer.
- `npm start` starts the server at http://localhost:3000.
- `npm test` runs the automated tests.

### Evidence still to collect
Run the tests locally and capture their output. Manually verify keyboard-only operation in a browser and capture a screenshot. Do not mark manual checks complete until they have actually been performed.