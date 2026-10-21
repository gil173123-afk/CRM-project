# CRM Build Log

## CRM 1 — Contact Starter
- Created a responsive workspace shell and contact list/search.
- Added a Node.js HTTP server and JSON file persistence.
- Added baseline automated tests.

## CRM 2 — Contacts and Login (work in progress)
- Added 30 fake classroom contacts and five household definitions on branch `crm2-classroom-seed`.
- Added `npm run seed -- contacts` and `npm run seed -- households` to reload the classroom fixtures.
- Added server-side contact validation: trimmed names, optional but validated email, case-insensitive email uniqueness, duplicate ID rejection, and stable IDs on edits.
- Added contact edit endpoint, tag filtering, household links, archive endpoint, and an append-only JSON audit log for create/edit/archive events.
- Added demo login endpoints and role enforcement for contact writes. Viewer writes are rejected by the server; only admin can read the audit log.
- Added form controls for tags, household, email permission, edit/cancel, archive, and archived filtering.
- Added tests covering contact validation, edits, viewer restrictions, login requirements, household data, and archive/audit behavior.

## Run locally
- Requires Node.js 20 or newer.
- `npm install` is not required; there are no external dependencies.
- `npm run seed -- contacts households` reloads both classroom fixture sections. This overwrites the current local contact and household JSON files, so only run it when you intend to reset them.
- `npm start` starts the server at http://localhost:3000.
- `npm test` runs automated tests.

## Demo accounts
- Admin: username `admin`, password `admin-demo`
- Staff: username `staff`, password `staff-demo`
- Viewer: username `viewer`, password `viewer-demo`

These are classroom-only demo credentials and must not be used for a real deployment.

## Remaining verification
The app changes have been committed to this branch, but runtime tests have not yet been executed in a local Node.js environment. Review the automated CI result before treating the build as passing. Manually verify keyboard-only operation, failed-save behavior, role UI, and persistence after restarting the server. Capture a real demo video and add its link to `tests/crm2-tests.md` before submission.
