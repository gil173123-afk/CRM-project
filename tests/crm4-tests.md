# CRM 4 — Donations and Events test notes

## Setup
Use Node.js 20 or newer:
```sh
npm run seed -- contacts households memberships events donations tasks
npm test
npm start
``
The seed command resets the selected fake classroom data files. Do not reseed during persistence tests. Demo accounts: admin / admin-demo, staff / staff-demo, viewer / viewer-demo.

## Automated tests
`tests/crm4-donations-events.test.js` covers:
- Creating a donation linked to an existing contact and fundraising event.
- Rejecting impossible dates and unknown contacts.
- Rejecting duplicate donation references without duplicate saves.
- Creating linked follow-up tasks, preventing duplicate follow-up keys, editing and completing tasks.
- Rejecting viewer write requests for donations, events and tasks.
- Audit actor/action/timestamp for task activity.
- The complete suite also includes CRM 2 and CRM 3 regression tests.

## Manual rubric checklist
- [ ] Log in as staff and create a donation for a valid contact, with a unique reference, amount, date, method and status.
- [ ] Try an impossible date, non-positive amount, nonexistent contact, and reused reference; confirm the app displays a useful error and saves no duplicate.
- [ ] Create a fundraising event with a goal; link received donations and verify the event total.
- [ ] Edit a task, mark it completed, and verify its status and completion timestamp persist after restart.
- [ ] Create the same follow-up twice with the same contact/title; verify only one task exists.
- [ ] Confirm donation/task records retain their contact/event/donation links.
- [ ] As viewer, attempt writes through the UI and direct API; verify requests are rejected and files remain unchanged.
- [ ] Verify audit history and keyboard-only operation, labels and visible focus.
- [ ] Record a real demo video and add its share URL here: **Not recorded yet**.

## Evidence status
Automated CI must pass for the current branch head before marking automated tests complete. Manual browser checks and demo-video evidence remain incomplete until performed; no video URL is fabricated.
