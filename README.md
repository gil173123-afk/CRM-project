# CRM-project

A small, dependency-free Node.js starter for the CRM 1 Contact Starter assignment.

## Requirements
- Node.js 20 or newer

## Run the app
```sh
npm start
```
Open http://localhost:3000.

## Run tests
```sh
npm test
```

## Included features
- Responsive menu: Dashboard, Contacts, Memberships, Donations, Tasks, Reports, Settings.
- Five seeded sample contacts in `data/contacts.json`.
- Contact listing and case-insensitive search across name, organization, email, and phone.
- Contact creation with server-side rejection of blank names.
- JSON file persistence for newly added contacts.
- Automated tests for the home page, five seed contacts, search, blank-name rejection, and saving a valid contact.

The menu's Memberships, Donations, Tasks, Reports, and Settings pages are still placeholders; the completed functional area is Contacts.

## CRM 1 task evidence
- Eight planning sketches: [docs/screens](docs/screens/01-dashboard.svg)
- Automated test and keyboard-check instructions: [tests/crm1-tests.md](tests/crm1-tests.md)
- Build log and improvement notes: [docs/build-log.md](docs/build-log.md)

The test instructions describe checks to perform; manual keyboard use and screenshots still need to be performed and captured by the student.