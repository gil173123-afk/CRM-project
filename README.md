# CRM-project

A dependency-free Node.js classroom CRM starter for CRM 2.

## Requirements
- Node.js 20 or newer

## Run the app
```sh
npm start
```
Open http://localhost:3000.

## Seed classroom data
```sh
npm run seed -- contacts households
```
This resets `data/contacts.json` and `data/households.json` using `data/crm-classroom-test-data.json`. It overwrites local changes to those files.

## Run tests
```sh
npm test
```

## Demo logins
- Admin: `admin` / `admin-demo`
- Staff: `staff` / `staff-demo`
- Viewer: `viewer` / `viewer-demo`

Demo passwords are for local classroom testing only, not production authentication.

## Included CRM 2 work
- 30 fake contacts, five households, tags, email permission, and archive status.
- Contact search, tag filtering, edit/cancel, email validation and case-insensitive uniqueness.
- JSON persistence, server-side role enforcement for contact writes, and audit log entries for contact changes.
- Demo login/logout and admin-only audit log endpoint.
- Automated server tests for key API behavior.

Memberships, donations, tasks, production-grade authentication, full settings management, reliable simulated storage failures, and final evidence capture are not complete. Check `docs/build-log.md` and `tests/crm2-tests.md` for current verification status.
