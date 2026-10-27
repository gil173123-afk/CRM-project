const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const sections = process.argv.slice(2);
const allowed = ["contacts", "households", "memberships", "donations", "events", "tasks"];
if (!sections.length || sections.some(section => !allowed.includes(section))) {
  console.error("Usage: npm run seed -- contacts [households] [memberships]");
  console.error("Available seed sections: contacts, households, memberships, donations, events, tasks");
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

if (sections.includes("events")) {
  const events = [
    {id:"E101",name:"Autumn Community Walk",date:"2026-10-24",goal:2500,description:"Classroom fundraiser"},
    {id:"E102",name:"Winter Giving Campaign",date:"2026-12-05",goal:5000,description:"Classroom campaign"}
  ];
  save("fundraising-events.json", events);
  console.log("Seeded " + events.length + " fundraising events.");
}
if (sections.includes("donations")) {
  const events = JSON.parse(fs.readFileSync(path.join(root,"data","fundraising-events.json"),"utf8"));
  const contacts = JSON.parse(fs.readFileSync(path.join(root,"data","contacts.json"),"utf8"));
  const donors = contacts.slice(0,5);
  const donations = donors.map((c,i)=>({id:"D10"+(i+1),contact_id:c.id,event_id:events[i%events.length].id,membership_id:null,amount:[50,100,25,75,150][i],date:source.test_date,status:"received",method:"seeded",reference:"DON-SEED-10"+(i+1),notes:"Fake classroom donation",created_by:"seed",created_at:source.test_date+"T00:00:00.000Z"}));
  save("donations.json", donations);
  console.log("Seeded " + donations.length + " fake donations.");
}
if (sections.includes("tasks")) {
  const contacts = JSON.parse(fs.readFileSync(path.join(root,"data","contacts.json"),"utf8"));
  const tasks = contacts.slice(0,3).map((c,i)=>({id:"T10"+(i+1),title:["Thank donor","Send event details","Follow up on pledge"][i],contact_id:c.id,donation_id:null,event_id:"E101",due_date:"2026-10-20",status:"open",notes:"Seeded classroom follow-up",followup_key:"seed:"+c.id+":"+i,created_by:"seed",created_at:source.test_date+"T00:00:00.000Z",completed_at:null}));
  save("tasks.json", tasks);
  console.log("Seeded " + tasks.length + " fake tasks.");
}
