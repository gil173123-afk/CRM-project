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


## CRM 3 — Memberships and Renewals (branch: crm3-memberships-renewals)
- Added a membership seed mode that imports all 20 classroom membership records and creates fake payment-history records.
- Added persisted membership periods, payments, and plan settings JSON files.
- Added membership status API with a shared As of date, active/expiring/expired/pending lists, paid-membership counts, and deduplicated covered-person counts.
- Added calendar-year period calculations, leap-day handling, end-exclusive coverage, early/late renewals, saved prices, payment-code uniqueness and idempotent paid retries.
- Added staff/admin membership write permissions, viewer write rejection, admin-only plan settings, and membership/payment audit entries.
- Added membership and renewal forms, status filters, coverage-period history, payment history, and admin plan-price screen.
- Added automated CRM 3 tests for fixture baseline counts, early and late renewals, duplicate codes, failed/pending renewals, leap-day/year-end dates, 30/31-day status boundary, saved plan prices and viewer restrictions.
- Tests are configured to run with `npm test`; their latest result must be checked before treating this branch as verified.
- Manual browser keyboard checks and a real demo video are not claimed complete until captured.


## CRM 4 — Donations and Events (branch: crm4-donations-events)
- Added persisted donation records linked to contacts and optional fundraising events, with amount/date/status/reference validation.
- Added fundraising event records with goals and received-donation totals in the interface.
- Added linked follow-up tasks with edit/complete controls and follow-up-key deduplication.
- Added server-side admin/staff write checks; viewers are rejected for donations, events and tasks.
- Added audit entries for donation, event and task creation and task edits/completion.
- Added seed modes for events, donations and tasks and automated tests for linked records, duplicate references/follow-ups, invalid inputs, role enforcement and audit history.
- CRM 4 automated and manual evidence status is tracked in tests/crm4-tests.md and tests/crm4-test-output.txt.
