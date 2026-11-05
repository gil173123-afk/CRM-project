# CRM 6 — rubric tests

## Automated tests
Run with Node.js 20 or newer:

```sh
npm test
```

The CRM 6 suite is in `tests/crm6-integration.test.js` and checks:
- Dashboard/report summary totals update when a gift is cancelled.
- Cancelled gifts remain saved and both creation/cancellation appear in record history.
- Campaign downloads contain received gifts and repeated file keys create one saved file.
- Full backup contains contact, household, membership periods, payment, donation, task and audit datasets.
- Restore writes a separate copy, preserving IDs, dates, amounts and links, without changing original live data.
- Viewer read access and server-side write restrictions.
- Fixture baseline contains 30 contacts and five households.

## Manual test run — October 15, 2026 practice example
- [ ] Run `npm run seed -- all` once to load the fake classroom baseline.
- [ ] Sign in as staff. Add a new fake contact and note its generated contact ID.
- [ ] Create an individual membership for that contact for $35, paid October 15, 2026; verify the saved membership ID, paid period and payment record.
- [ ] Renew the membership using a unique payment code; verify the renewal appears in the membership history and a repeated code does not add a second payment/period.
- [ ] Create a fundraising campaign and a received gift linked to the same contact and campaign.
- [ ] Create a thank-you task linked to the contact and gift, then mark it completed.
- [ ] Open Dashboard and Reports. Verify the same totals are shown.
- [ ] Download the campaign file and inspect that it includes the gift. Repeat the download without changing gifts and verify only one file record is saved.
- [ ] Cancel the gift. Verify its history remains, its status changes, and received totals update in both Dashboard and Reports.
- [ ] Archive a test contact and verify the contact and linked history remain available through record history.
- [ ] Restart the server using `npm start` only. Verify all new records and statuses persist.
- [ ] As viewer, attempt direct write requests for contacts, memberships, donations, tasks, campaign files and backup restore. Confirm the server rejects each request and no data changes.
- [ ] As admin, download a full backup. Restore it into a separate copy. Compare IDs, dates, amounts, links, totals and audit history; confirm original live data is unchanged.
- [ ] Check keyboard-only navigation, focus indicators, form labels and narrow-phone layout. Verify wide tables scroll within their own containers.

## Evidence status
Automated tests are authored but must pass in GitHub Actions for this branch before being marked passed. Manual browser checks and a real demonstration video are not claimed complete here.
