# CRM 2 test plan and evidence

## Automated tests
Run `npm test` from the repository root. GitHub Actions runs this command on pushes and pull requests and checks the classroom fixture count. Tests cover:
- Home page response and case-insensitive contact search.
- Blank names, malformed email, duplicate email and stable IDs on edit.
- Logged-out write rejection and server-side viewer restrictions.
- Contact archive preserving the record and creating an audit entry.
- Household endpoint and fixture integrity (30 contacts, five households, at least two linked contacts per household).
- Admin-only user/settings endpoints, custom user creation, duplicate usernames and email-permission defaults.
- Rejected edits do not partially alter stored contact data.

## Seed data
Run `npm run seed -- contacts households` to reset to the classroom fixture. This overwrites local contact/household JSON files. The expected pre-change fixture has 30 contacts and five households. The rubric's C130 archive scenario should leave 30 stored records, 29 active and one archived.

## Manual verification
- [ ] Sign in as admin, staff and viewer; verify role shown.
- [ ] Verify admin can create/delete custom users and change settings.
- [ ] Verify staff can manage contacts but cannot manage users/settings.
- [ ] Verify viewer can read contacts but server rejects create/edit/archive requests.
- [ ] Edit a contact, cancel an edit, and confirm ID is stable.
- [ ] Try blank name, invalid email, and duplicate email with different capitalization.
- [ ] Search by ID/name and filter by tag; confirm household relationships.
- [ ] Archive C130; confirm 30 stored, 29 active, 1 archived and notes/history retained.
- [ ] Restart the server without reseeding and confirm a saved change persists.
- [ ] Use only the keyboard; verify labels, focus indicator and useful validation errors.
- [ ] Cause a save validation/error response and confirm form values remain populated and stored data is unchanged.
- [ ] Record an actual short demo video and paste its share link here: **Not recorded yet**.

## Evidence rules
Do not claim a manual check passed without doing it. The test output file records the latest real CI result; if no current run is available, it says so.
