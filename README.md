# CRM-project

A dependency-free Node.js CRM classroom project for the CRM 2 Contacts and Login rubric.

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
