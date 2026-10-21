# CRM 2 test plan and evidence

## Automated tests
Run `npm test` from the repository root. Tests cover:
- Home page response.
- Case-insensitive contact search.
- Server rejection of blank names, malformed emails, and duplicate emails.
- Contact creation and edits that preserve the original ID.
- Server rejection of writes by viewers and logged-out users.
- Archive behavior that retains the contact record and writes an audit entry.
- Household endpoint output.

## Seed data
Run `npm run seed -- contacts households` to reset to the classroom fixture. Expected starting state: 30 saved contacts and five households. The command overwrites local JSON data; do not run it after making changes you need to preserve.

## Manual test checklist
- [ ] Log in as admin, staff, and viewer; verify the displayed role.
- [ ] Verify admin/staff can add, edit, and archive contacts.
- [ ] Verify viewer cannot write, including by sending a direct API request.
- [ ] Edit a contact and confirm its ID remains unchanged.
- [ ] Try a blank name, invalid email, and duplicate email with different capitalization.
- [ ] Search by contact ID/name and filter by tag.
- [ ] Confirm household links are represented in contact records.
- [ ] Archive C130; verify 30 saved records remain, with 29 active and one archived.
- [ ] Restart the server and verify saved changes persist without reseeding.
- [ ] Use only the keyboard; check visible focus, labels, and validation messages.
- [ ] Simulate an unavailable/failed save and confirm form values are retained.
- [ ] Record a short demo video and paste its share link here: **Not recorded yet**.

## Test output
Paste the real output of `npm test` here after running it. Do not mark tests as passed until the command and manual checks have actually completed.
