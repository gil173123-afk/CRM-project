# CRM 3 — Memberships and Renewals test notes

## Setup
Requires Node.js 20 or newer. From the repository root:
```sh
npm run seed -- contacts households memberships
npm test
npm start
``
The seed command overwrites local contact, household and membership data with the fake classroom fixture. It also resets fake payment history and plan prices. Do not reseed between a save/restart persistence check.

Demo logins: admin / admin-demo; staff / staff-demo; viewer / viewer-demo.

## Automated coverage
- Baseline 20 membership records, 12 active/paid memberships, six expiring, four expired, four pending, 14 covered people as of 2026-10-15.
- Early renewal of M101 starts 2026-10-31 and ends 2027-10-31; counts remain 12 active and 14 covered people while expiring drops from six to five.
- Repeating paid code R-M101-01 for the same membership, amount and date is idempotent.
- Failed/pending renewals do not add a paid period.
- Late renewal for M113 starts 2026-10-15 and ends 2027-10-15.
- Leap-day start 2028-02-29 ends 2029-02-28; impossible dates are rejected.
- Year-end start 2026-12-31 ends 2027-12-31.
- End date is exclusive; 31 days remaining is not expiring, 30 days remaining is expiring.
- Admin-only plan settings; changing plan prices does not rewrite saved membership prices.
- Viewer can read memberships but cannot renew them.

## Required manual checks
- [ ] Seed memberships and verify 20 records; restart the app without reseeding and confirm saved changes remain.
- [ ] Set As of to 2026-10-15 and verify baseline counts: 12 active, 6 expiring, 4 expired, 4 pending, 14 people.
- [ ] Open M101 and verify C101/H101, saved price $40, end 2026-10-31, and two household members.
- [ ] Change family plan price as admin, verify M101 still has a saved price of $40, then restore family price to $40.
- [ ] Submit a new individual membership for C130 for $35 with code NEW-C130-01; expected period 2026-10-15–2027-10-15; verify counts become 13 active and 15 people.
- [ ] Renew M101 on 2026-10-15 for $40 with code R-M101-01 from a fresh baseline; verify new period 2026-10-31–2027-10-31, 12 active, 14 people and 5 expiring.
- [ ] From separate fresh baselines, test failed and pending renewals, then test repeating R-M101-01 twice. Failed/pending must not extend coverage; repeated paid code must not add another payment or year.
- [ ] Test wrong amount, impossible date, unknown contact/household and duplicate payment code; confirm no partial membership/payment write.
- [ ] Test late renewal M113 from a fresh baseline.
- [ ] Test 31-day, 30-day and end-date status cases.
- [ ] Test leap-day, year-end, and family membership covering three people in an isolated test dataset.
- [ ] As viewer, try renew in the UI and send a direct renewal request; verify both are rejected and stored data is unchanged.
- [ ] Verify audit history records actor, membership/payment ID, action and timestamp.
- [ ] Use keyboard only; check labels, focus indicator and validation messages.
- [ ] Record a short demo video showing the above and add the share link here: **Not recorded yet**.

## Evidence status
Automated test source is in `tests/crm3-memberships.test.js`. Do not mark tests passed until the current GitHub Actions run or local `npm test` output is reviewed. Manual browser checks and demo-video evidence are not complete until performed.
