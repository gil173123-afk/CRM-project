const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const sections = process.argv.slice(2);
const allowed = ["contacts", "households", "memberships"];
if (!sections.length || sections.some(section => !allowed.includes(section))) {
  console.error("Usage: npm run seed -- contacts [households] [memberships]");
  console.error("Available seed sections: contacts, households, memberships");
  process.exit(1);
}
const source = JSON.parse(fs.readFileSync(path.join(root, "data", "crm-classroom-test-data.json"), "utf8"));
function save(name, value) {
  fs.writeFileSync(path.join(root, "data", name), JSON.stringify(value, null, 2) + "\n");
}
if (sections.includes("contacts")) {
  const contacts = source.contacts.map(contact => ({...contact, organization: contact.organization || "", tags: Array.isArray(contact.tags) ? contact.tags : [], email_opt_in: contact.email_opt_in === true, archived: contact.archived === true}));
  save("contacts.json", contacts);
  console.log("Seeded " + contacts.length + " classroom contacts.");
}
if (sections.includes("households")) {
  const households = source.households || [];
  save("households.json", households);
  console.log("Seeded " + households.length + " classroom households.");
}
if (sections.includes("memberships")) {
  const memberships = (source.memberships || []).map(m => ({...m, periods: m.payment_status === "paid" && m.start_date && m.end_date ? [{start_date:m.start_date,end_date:m.end_date,price:m.price,payment_status:"paid",payment_code:m.payment_code}] : []}));
  const payments = (source.memberships || []).map(m => ({id:"P-SEED-"+m.id,membership_id:m.id,payment_code:m.payment_code,amount:m.price,date:m.start_date || source.test_date,method:"seeded",status:m.payment_status,created_by:"seed",created_at:new Date(source.test_date+"T00:00:00.000Z").toISOString()}));
  save("memberships.json", memberships);
  save("payments.json", payments);
  save("membership-plans.json", [
    {id:"individual",name:"Individual",price:35,duration_years:1},
    {id:"family",name:"Family",price:40,duration_years:1},
    {id:"student_senior",name:"Student / Senior",price:30,duration_years:1}
  ]);
  console.log("Seeded " + memberships.length + " memberships and " + payments.length + " fake payment records.");
}
