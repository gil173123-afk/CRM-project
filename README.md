# CRM-project

A dependency-free Node.js CRM classroom project covering contacts/login (CRM 2) and memberships/renewals (CRM 3).

## Requirements
- Node.js 20 or newer

## Run the app
```sh
npm start
```
Open http://localhost:3000.

## Load classroom data
```sh
npm run seed -- contacts households
```
This resets `data/contacts.json` and `data/households.json` using `data/crm-classroom-test-data.json`. It overwrites local changes to those files.

## Run automated tests
```sh
npm test
```
GitHub Actions also runs the test suite and checks that the classroom fixture contains 30 contacts and five households.

## Demo logins
- Admin: `admin` / `admin-demo`
- Staff: `staff` / `staff-demo`
- Viewer: `viewer` / `viewer-demo`

These are classroom demo credentials, not production security. Custom user passwords are stored in local JSON for this small, dependency-free exercise.

## Implemented CRM 2 features
- 30 fake contacts and five households, with seed command and fixture file.
- Contact create/edit/cancel, stable IDs, trim/validation, optional email, case-insensitive unique email, permission-to-email flag.
- Search by name/ID/organization/email/phone, tag filtering, household assignment, archive without deleting history.
- Login/logout; server-enforced admin/staff/viewer permissions.
- Admin-only user management, workspace settings and audit-log access.
- JSON persistence and automated tests for validation, permissions, archive/audit behavior, admin APIs and fixture counts.

## Role permissions

| Capability | Admin | Staff | Viewer |
|---|---|---|---|
| Read contacts | Yes | Yes | Yes |
| Create, edit and archive contacts | Yes | Yes | No (server rejects writes) |
| Manage users | Yes | No | No |
| Change workspace settings | Yes | No | No |
| Read audit log | Yes | No | No |

## Evidence
See `docs/build-log.md`, `tests/crm2-tests.md`, and `tests/crm2-test-output.txt`. Do not mark browser-only checks or demo-video evidence complete until actually performed.


## CRM 3 — Memberships and Renewals
- Seed membership data and fake payment history with `npm run seed -- memberships`.
- The seed file is `data/crm-classroom-test-data.json`; the command writes `data/memberships.json`, `data/payments.json`, and `data/membership-plans.json`.
- Demo plan prices: individual $35, family $40, student/senior $30. Each plan lasts one calendar year.
- Open **Memberships** after logging in. Admin and staff can create memberships and record renewals; viewers are blocked by server-side checks.
- Membership status lists use the selected **As of date**. The start date is covered; the end date is not. Expiring means 1–30 days remain and is a subset of Active.
- Early renewals start at the previous paid end date; late renewals start on the payment date. Leap-day periods end on February 28 the following year.
- Payment codes are unique. Repeating the same paid code for the same membership, amount, and date is idempotent. Failed/pending renewals do not add paid coverage.
- Only admins can change plan prices. A saved price remains on past membership periods when plan settings change.
- Membership periods, payment history, and audit events persist in JSON files. Use fake payment methods only.

## CRM 3 test commands
```sh
npm run seed -- memberships
npm test
```
The test suite includes `tests/crm3-memberships.test.js`. See `tests/crm3-tests.md` for the required manual checks and video evidence status.
