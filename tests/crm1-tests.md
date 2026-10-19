# CRM 1 test and proof checklist

Run `npm test` from the project root. The automated tests use Node's built-in test runner and temporary data files so test runs do not change the sample contact list.

## Automated checks

- The home page is served.
- Five sample contacts are present.
- Search finds a name regardless of capitalization.
- Blank and whitespace-only names are rejected by the server.
- A valid contact is saved and appears in the contact list.

## Manual keyboard check

1. Start the app with `npm start` and open http://localhost:3000.
2. Use **Tab** to move through the menu links and buttons; use **Enter** to open Contacts.
3. Continue with Tab until the contact form fields and Save contact button are focused.
4. Enter a contact using the keyboard and press Enter from a form field to submit.
5. Leave Name empty and submit; confirm a clear validation message appears.
6. Use the search field and type part of a name; confirm the list filters.
7. Capture a screenshot of the contact list and terminal test output for submission evidence.

## Improvement made

The contact starter includes case-insensitive search across name, organization, email, and phone, plus server-side name validation. These make contact lookup more forgiving and prevent blank-name records even if browser-side validation is bypassed.

Record your own test run and screenshots before submitting; this file is a checklist, not a claim that manual checks have already been performed.