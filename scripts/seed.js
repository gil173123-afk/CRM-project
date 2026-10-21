const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const sections = process.argv.slice(2);
if (!sections.length || sections.some(section => !["contacts", "households"].includes(section))) {
  console.error("Usage: npm run seed -- contacts [households]");
  console.error("Available seed sections: contacts, households");
  process.exit(1);
}
const source = JSON.parse(fs.readFileSync(path.join(root, "data", "crm-classroom-test-data.json"), "utf8"));
if (sections.includes("contacts")) {
  const contacts = source.contacts.map(contact => ({
    ...contact,
    organization: contact.organization || "",
    tags: Array.isArray(contact.tags) ? contact.tags : [],
    email_opt_in: contact.email_opt_in === true,
    archived: contact.archived === true
  }));
  fs.writeFileSync(path.join(root, "data", "contacts.json"), JSON.stringify(contacts, null, 2) + "\n");
  console.log("Seeded " + contacts.length + " classroom contacts.");
}
if (sections.includes("households")) {
  const households = source.households || [];
  fs.writeFileSync(path.join(root, "data", "households.json"), JSON.stringify(households, null, 2) + "\n");
  console.log("Seeded " + households.length + " classroom households.");
}
