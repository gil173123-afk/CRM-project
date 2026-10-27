const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createServer } = require("../server");
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","crm-classroom-test-data.json"),"utf8"));

async function withServer(run) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"crm4-test-"));
  const files={dataFile:path.join(dir,"contacts.json"),householdsFile:path.join(dir,"households.json"),auditFile:path.join(dir,"audit.json"),usersFile:path.join(dir,"users.json"),settingsFile:path.join(dir,"settings.json"),membershipsFile:path.join(dir,"memberships.json"),paymentsFile:path.join(dir,"payments.json"),plansFile:path.join(dir,"plans.json"),donationsFile:path.join(dir,"donations.json"),eventsFile:path.join(dir,"events.json"),tasksFile:path.join(dir,"tasks.json")};
  fs.writeFileSync(files.dataFile,JSON.stringify(fixture.contacts.map(c=>({...c,archived:false}))));
  fs.writeFileSync(files.householdsFile,JSON.stringify(fixture.households));
  for(const key of ["membershipsFile","paymentsFile","plansFile","donationsFile","eventsFile","tasksFile","auditFile","usersFile","settingsFile"])fs.writeFileSync(files[key],"[]");
  const server=createServer({...files,sessions:new Map()});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  async function login(username,password){const r=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});assert.equal(r.status,200);return {cookie:r.headers.get("set-cookie").split(";")[0],request:(url,options={})=>fetch(base+url,{...options,headers:{"Content-Type":"application/json",cookie:r.headers.get("set-cookie").split(";")[0],...(options.headers||{})}})};}
  try{await run({base,files,login});}finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
}
const json=body=>JSON.stringify(body);

test("staff can create a donation linked to an existing contact and event",async()=>withServer(async({login,files})=>{
 const staff=await login("staff","staff-demo");
 const ev=await staff.request("/api/fundraising-events",{method:"POST",body:json({name:"Community Walk",date:"2026-10-24",goal:1000,description:"Walk"})});
 assert.equal(ev.status,201);const event=(await ev.json()).event;
 const res=await staff.request("/api/donations",{method:"POST",body:json({contact_id:"C101",event_id:event.id,amount:50,date:"2026-10-15",method:"cash",status:"received",reference:"DON-001"})});
 assert.equal(res.status,201);const donation=(await res.json()).donation;assert.equal(donation.contact_id,"C101");assert.equal(donation.event_id,event.id);
 assert.equal(JSON.parse(fs.readFileSync(files.donationsFile,"utf8")).length,1);
}));

test("donation rejects bad dates, missing contacts, and duplicate references without saving",async()=>withServer(async({login,files})=>{
 const staff=await login("staff","staff-demo");
 const baseBody={contact_id:"C101",amount:20,date:"2026-10-15",status:"received",reference:"DON-UNIQUE"};
 assert.equal((await staff.request("/api/donations",{method:"POST",body:json({...baseBody,date:"2026-02-30"})})).status,400);
 assert.equal((await staff.request("/api/donations",{method:"POST",body:json({...baseBody,contact_id:"MISSING"})})).status,400);
 assert.equal((await staff.request("/api/donations",{method:"POST",body:json(baseBody)})).status,201);
 assert.equal((await staff.request("/api/donations",{method:"POST",body:json(baseBody)})).status,409);
 assert.equal(JSON.parse(fs.readFileSync(files.donationsFile,"utf8")).length,1);
}));

test("follow-up tasks link to contacts, prevent duplicate follow-ups, and can be edited/completed",async()=>withServer(async({login,files})=>{
 const staff=await login("staff","staff-demo");
 const body={title:"Thank donor",contact_id:"C101",due_date:"2026-10-20",followup_key:"donation:C101:thanks"};
 const created=await staff.request("/api/tasks",{method:"POST",body:json(body)});assert.equal(created.status,201);const task=(await created.json()).task;
 const duplicate=await staff.request("/api/tasks",{method:"POST",body:json(body)});assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).duplicate,true);
 const edited=await staff.request("/api/tasks/"+task.id,{method:"PUT",body:json({title:"Thank donor by email",status:"completed"})});assert.equal(edited.status,200);assert.equal((await edited.json()).task.status,"completed");
 const tasks=JSON.parse(fs.readFileSync(files.tasksFile,"utf8"));assert.equal(tasks.length,1);assert.ok(tasks[0].completed_at);
}));

test("viewers cannot write donations, events or tasks",async()=>withServer(async({login,files})=>{
 const viewer=await login("viewer","viewer-demo");
 assert.equal((await viewer.request("/api/donations",{method:"POST",body:json({contact_id:"C101",amount:10,date:"2026-10-15",reference:"VIEWER-DON"})})).status,403);
 assert.equal((await viewer.request("/api/fundraising-events",{method:"POST",body:json({name:"Nope",date:"2026-10-15",goal:100})})).status,403);
 assert.equal((await viewer.request("/api/tasks",{method:"POST",body:json({title:"Nope",contact_id:"C101"})})).status,403);
 assert.equal(JSON.parse(fs.readFileSync(files.donationsFile,"utf8")).length,0);
 assert.equal(JSON.parse(fs.readFileSync(files.eventsFile,"utf8")).length,0);
 assert.equal(JSON.parse(fs.readFileSync(files.tasksFile,"utf8")).length,0);
}));

test("linked donation and task actions are audited",async()=>withServer(async({login,files})=>{
 const staff=await login("staff","staff-demo");
 const res=await staff.request("/api/tasks",{method:"POST",body:json({title:"Follow up",contact_id:"C101",followup_key:"audit-followup"})});assert.equal(res.status,201);
 const task=(await res.json()).task;
 const audit=JSON.parse(fs.readFileSync(files.auditFile,"utf8"));
 assert.ok(audit.some(entry=>entry.membership_id===task.id&&entry.action==="create-task"&&entry.actor==="staff-demo"));
 assert.ok(audit.some(entry=>entry.membership_id===task.id&&Number.isFinite(Date.parse(entry.timestamp))));
}));
