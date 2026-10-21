# CRM Build Log

## CRM 1 — Contact Starter
- Created a responsive workspace shell and contact list/search.
- Added a dependency-free Node.js HTTP server and JSON file persistence.
- Added baseline automated tests.

## CRM 2 — Contacts and Login
- Added the classroom fixture with 30 fake contacts, five households, membership/donation/task examples, and expected-result checkpoints.
- Added `npm run seed -- contacts` and `npm run seed -- households` to load contact and household fixtures from `data/crm-classroom-test-data.json`.
- Added contact create/edit/cancel, stable IDs, trimming, optional email validation, case-insensitive email uniqueness, duplicate-ID rejection, email permission, tags, household assignment, search and tag filtering.
- Added archive/restore-by-filter behavior that retains the contact and its notes, and JSON audit entries with actor, contact ID, action, and timestamp.
- Added demo login/logout and server-side role enforcement. Staff can manage contacts; viewers can read but server writes are rejected; only admins can manage users/settings and view audit history.
- Added admin user create/delete and persistent workspace settings, including the default email-permission preference.
- Used temporary data files in automated tests to avoid modifying classroom data during tests.
- Added CI to run `npm test` and check fixture counts on branch pushes and pull requests.

## Run locally
- Requires Node.js 20 or newer. No third-party npm packages are required.
- `npm run seed -- contacts households` resets the contact and household JSON files to classroom fixtures. This overwrites those local files.
- `npm start` starts the app at http://localhost:3000.
- `npm test` runs automated server tests.

## Demo accounts
- Admin: `admin` / `admin-demo`
- Staff: `staff` / `staff-demo`
- Viewer: `viewer` / `viewer-demo`

These demo credentials are for local classroom use only. This project is not production-ready authentication: custom demo user passwords are stored in a local JSON file and should not be used for real users.

## Rubric verification status
- Automated API tests and fixture-count checks are configured in GitHub Actions. Review the latest run on the `crm2-rubric-completion` branch before treating the current code as passing.
- The browser-based keyboard-only walkthrough, real server-restart persistence check, and actual video recording are evidence tasks that cannot be honestly marked complete without executing/capturing them.
- The CRM 2 rubric focuses on contacts/login; membership, donation, and task records are fixture data for future classroom exercises and are not full interactive modules in this build.
