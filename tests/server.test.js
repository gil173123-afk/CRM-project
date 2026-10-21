const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createServer } = require("../server");

async function withServer(run) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "crm2-test-"));
  const dataFile = path.join(folder, "contacts.json");
  const householdsFile = path.join(folder, "households.json");
  const auditFile = path.join(folder, "audit-log.json");
  fs.writeFileSync(dataFile, JSON.stringify([
    {id:"C101",name:"Alex Rivera",email:"person101@example.com",phone:"555-0101",tags:["member"],household_id:"H101",email_opt_in:true,archived:false},
    {id:"C102",name:"Sam Lee",email:"person102@example.com",phone:"555-0102",tags:["donor"],household_id:"H101",email_opt_in:false,archived:false}
  ]));
  fs.writeFileSync(householdsFile, JSON.stringify([{id:"H101",name:"Test household 1",contact_ids:["C101","C102"]}]));
  const server = createServer({ dataFile, householdsFile, auditFile, sessions: new Map() });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  async function login(username, password) {
    const response = await fetch(base + "/api/login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie").split(";")[0];
    return { cookie, request:(url, options={})=>fetch(base+url,{...options,headers:{...(options.headers||{}),Cookie:cookie}}) };
  }
  try { await run({base,login,dataFile,auditFile}); }
  finally {
    await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    fs.rmSync(folder,{recursive:true,force:true});
  }
}

test("serves the CRM home page", async () => withServer(async ({base}) => {
  const response=await fetch(base+"/");
  assert.equal(response.status,200);
  assert.match(await response.text(),/North Star CRM/);
}));

test("lists and searches seeded contacts case-insensitively", async () => withServer(async ({base}) => {
  const all=await (await fetch(base+"/api/contacts")).json();
  assert.equal(all.contacts.length,2);
  const found=await (await fetch(base+"/api/contacts?q=ALEX")).json();
  assert.equal(found.contacts[0].id,"C101");
}));

test("rejects blank names, invalid email and duplicate email", async () => withServer(async ({login}) => {
  const staff=await login("staff","staff-demo");
  for(const body of [{name:"  "},{name:"New",email:"not-an-email"},{name:"Other",email:"PERSON101@example.com"}]){
    const response=await staff.request("/api/contacts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    assert.equal(response.status,400);
  }
}));

test("creates and edits a contact without changing its ID", async () => withServer(async ({login}) => {
  const staff=await login("staff","staff-demo");
  const created=await staff.request("/api/contacts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"  Morgan Lee ",email:"morgan@example.com",tags:["member"],household_id:"H101"})});
  assert.equal(created.status,201);
  const contact=(await created.json()).contact;
  assert.equal(contact.name,"Morgan Lee");
  const edited=await staff.request("/api/contacts/"+contact.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:"not-the-same",name:"Changed"})});
  assert.equal(edited.status,400);
  const saved=await staff.request("/api/contacts/"+contact.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Changed",email:"morgan@example.com",tags:["donor"],household_id:"H101",email_opt_in:true})});
  assert.equal(saved.status,200);
  const savedBody=await saved.json();
  assert.equal(savedBody.contact.id,contact.id);
  assert.equal(savedBody.contact.name,"Changed");
}));

test("viewer can read but cannot create contacts", async () => withServer(async ({login}) => {
  const viewer=await login("viewer","viewer-demo");
  assert.equal((await viewer.request("/api/contacts")).status,200);
  const write=await viewer.request("/api/contacts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Forbidden"})});
  assert.equal(write.status,403);
}));

test("rejects writes when logged out", async () => withServer(async ({base}) => {
  const response=await fetch(base+"/api/contacts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Unauthenticated"})});
  assert.equal(response.status,401);
}));

test("archive retains the record and creates an audit entry", async () => withServer(async ({login,base,auditFile}) => {
  const staff=await login("staff","staff-demo");
  const archived=await staff.request("/api/contacts/C101/archive",{method:"POST"});
  assert.equal(archived.status,200);
  const active=await (await fetch(base+"/api/contacts")).json();
  const hidden=await (await fetch(base+"/api/contacts?archived=true")).json();
  assert.equal(active.contacts.length,1);
  assert.equal(hidden.contacts.length,1);
  assert.equal(hidden.contacts[0].id,"C101");
  const logs=JSON.parse(fs.readFileSync(auditFile,"utf8"));
  assert.equal(logs.at(-1).action,"archive");
  assert.equal(logs.at(-1).contact_id,"C101");
}));

test("households endpoint returns seeded household data", async () => withServer(async ({base}) => {
  const data=await (await fetch(base+"/api/households")).json();
  assert.equal(data.households[0].id,"H101");
}));
