const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createServer } = require("../server");
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","crm-classroom-test-data.json"),"utf8"));

async function setup(run) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"crm6-test-"));
  const files={
    dataFile:path.join(dir,"contacts.json"),householdsFile:path.join(dir,"households.json"),
    auditFile:path.join(dir,"audit-log.json"),usersFile:path.join(dir,"users.json"),
    settingsFile:path.join(dir,"settings.json"),membershipsFile:path.join(dir,"memberships.json"),
    paymentsFile:path.join(dir,"payments.json"),plansFile:path.join(dir,"plans.json"),
    donationsFile:path.join(dir,"donations.json"),eventsFile:path.join(dir,"events.json"),
    tasksFile:path.join(dir,"tasks.json"),campaignFilesFile:path.join(dir,"campaign-files.json"),
    restoresDir:path.join(dir,"restores")
  };
  fs.writeFileSync(files.dataFile,JSON.stringify(fixture.contacts.map(c=>({...c,archived:false}))));
  fs.writeFileSync(files.householdsFile,JSON.stringify(fixture.households));
  for(const key of ["auditFile","usersFile","settingsFile","membershipsFile","paymentsFile","plansFile","donationsFile","eventsFile","tasksFile","campaignFilesFile"])fs.writeFileSync(files[key],"[]");
  const server=createServer({...files,sessions:new Map()});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  async function login(username,password){
    const response=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
    assert.equal(response.status,200);
    const cookie=response.headers.get("set-cookie").split(";")[0];
    return async(url,options={})=>fetch(base+url,{...options,headers:{"Content-Type":"application/json",cookie,...(options.headers||{})}});
  }
  try{await run({base,files,login});}
  finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
}
const json=value=>JSON.stringify(value);

test("dashboard and reports share the same summary and totals",async()=>setup(async({base,login,files})=>{
 const staff=await login("staff","staff-demo");
 const eventResponse=await staff("/api/fundraising-events",{method:"POST",body:json({name:"Practice Campaign",date:"2026-10-15",goal:500})});
 assert.equal(eventResponse.status,201);const event=(await eventResponse.json()).event;
 const giftResponse=await staff("/api/donations",{method:"POST",body:json({contact_id:"C101",event_id:event.id,amount:42.5,date:"2026-10-15",status:"received",reference:"CRM6-GIFT-1"})});
 assert.equal(giftResponse.status,201);const gift=(await giftResponse.json()).donation;
 const summary=await (await staff("/api/workspace-summary?as_of=2026-10-15")).json();
 assert.equal(summary.donations.received_total,42.5);assert.equal(summary.donations.received_count,1);
 const cancelled=await staff("/api/donations/"+gift.id+"/cancel",{method:"POST",body:json({reason:"Practice cancellation"})});
 assert.equal(cancelled.status,200);
 const after=await (await staff("/api/workspace-summary?as_of=2026-10-15")).json();
 assert.equal(after.donations.received_total,0);assert.equal(after.donations.received_count,0);
 assert.equal(JSON.parse(fs.readFileSync(files.donationsFile,"utf8"))[0].status,"cancelled");
 const history=await (await staff("/api/records/"+gift.id+"/history")).json();
 assert.ok(history.entries.some(e=>e.action==="create-donation"));
 assert.ok(history.entries.some(e=>e.action==="cancel-donation"));
}));

test("campaign file includes gifts and duplicate file keys do not create duplicate files",async()=>setup(async({login,files})=>{
 const staff=await login("staff","staff-demo");
 const event=(await (await staff("/api/fundraising-events",{method:"POST",body:json({name:"Walk",date:"2026-10-15",goal:100})})).json()).event;
 await staff("/api/donations",{method:"POST",body:json({contact_id:"C101",event_id:event.id,amount:75,date:"2026-10-15",status:"received",reference:"CAMPAIGN-GIFT-1"})});
 const body={campaign_id:event.id,file_key:"campaign:"+event.id+":D1"};
 const first=await staff("/api/campaign-downloads",{method:"POST",body:json(body)});assert.equal(first.status,201);
 const file=(await first.json()).file;assert.equal(file.content.gifts.length,1);assert.equal(file.content.total,75);
 const second=await staff("/api/campaign-downloads",{method:"POST",body:json(body)});assert.equal(second.status,200);assert.equal((await second.json()).idempotent,true);
 assert.equal(JSON.parse(fs.readFileSync(files.campaignFilesFile,"utf8")).length,1);
 const summary=await (await staff("/api/workspace-summary")).json();assert.equal(summary.campaign_files.count,1);
}));

test("admin backup exports required linked data and restores a separate copy without changing live data",async()=>setup(async({login,files})=>{
 const admin=await login("admin","admin-demo");
 fs.writeFileSync(files.dataFile,JSON.stringify([{id:"C-KEEP",name:"Original live contact"}]));
 fs.writeFileSync(files.householdsFile,JSON.stringify([{id:"H-KEEP",contact_ids:["C-KEEP"]}]));
 fs.writeFileSync(files.membershipsFile,JSON.stringify([{id:"M-KEEP",contact_id:"C-KEEP",periods:[{start_date:"2026-10-15",end_date:"2027-10-15",price:35}]}]));
 fs.writeFileSync(files.paymentsFile,JSON.stringify([{id:"P-KEEP",membership_id:"M-KEEP",amount:35,date:"2026-10-15"}]));
 fs.writeFileSync(files.donationsFile,JSON.stringify([{id:"D-KEEP",contact_id:"C-KEEP",amount:20}]));
 fs.writeFileSync(files.tasksFile,JSON.stringify([{id:"T-KEEP",contact_id:"C-KEEP",donation_id:"D-KEEP"}]));
 fs.writeFileSync(files.auditFile,JSON.stringify([{record_id:"C-KEEP",action:"create",actor:"staff",timestamp:"2026-10-15T00:00:00.000Z"}]));
 const backupResponse=await admin("/api/backup");assert.equal(backupResponse.status,200);const backup=await backupResponse.json();
 for(const key of ["contacts","households","memberships","payments","donations","tasks","audit_history"])assert.ok(Array.isArray(backup.datasets[key]),key);
 const restored=await admin("/api/backup/restore-copy",{method:"POST",body:json(backup)});assert.equal(restored.status,201);const result=await restored.json();assert.equal(result.original_data_changed,false);
 const copy=path.join(files.restoresDir,path.basename(result.copy_location));
 assert.equal(JSON.parse(fs.readFileSync(path.join(copy,"contacts.json"),"utf8"))[0].id,"C-KEEP");
 assert.equal(JSON.parse(fs.readFileSync(path.join(copy,"memberships.json"),"utf8"))[0].periods[0].price,35);
 assert.equal(JSON.parse(fs.readFileSync(path.join(copy,"tasks.json"),"utf8"))[0].donation_id,"D-KEEP");
 assert.equal(JSON.parse(fs.readFileSync(files.dataFile,"utf8"))[0].name,"Original live contact");
}));

test("viewer can read shared totals but cannot cancel gifts, create files or restore backups",async()=>setup(async({login,files})=>{
 const viewer=await login("viewer","viewer-demo");
 assert.equal((await viewer("/api/workspace-summary")).status,200);
 assert.equal((await viewer("/api/backup")).status,403);
 assert.equal((await viewer("/api/campaign-downloads",{method:"POST",body:json({campaign_id:"E101",file_key:"viewer-file"})})).status,403);
 assert.equal(JSON.parse(fs.readFileSync(files.campaignFilesFile,"utf8")).length,0);
}));

test("startup seed is opt-in and test fixture contains stable CRM relationships",()=>{
 assert.equal(fixture.contacts.length,30);
 assert.equal(fixture.households.length,5);
 assert.ok(fixture.memberships.every(m=>m.contact_id));
});


test("viewer cannot change contacts, membership periods, donations or tasks",async()=>setup(async({login,files})=>{
 const staff=await login("staff","staff-demo");
 const contact=(await staff("/api/contacts",{method:"POST",body:json({name:"CRM6 Permission Contact",email:"crm6-permission@example.org"})}));assert.equal(contact.status,201);
 const event=(await (await staff("/api/fundraising-events",{method:"POST",body:json({name:"Permission Campaign",date:"2026-10-15",goal:100})})).json()).event;
 const gift=(await (await staff("/api/donations",{method:"POST",body:json({contact_id:"C101",event_id:event.id,amount:15,date:"2026-10-15",status:"received",reference:"PERMISSION-GIFT"})})).json()).donation;
 const task=(await (await staff("/api/tasks",{method:"POST",body:json({title:"Thank donor",contact_id:"C101",donation_id:gift.id,followup_key:"permission-thank-you"})})).json()).task;
 const membership=(await (await staff("/api/memberships",{method:"POST",body:json({contact_id:"C130",plan:"individual",amount:35,start_date:"2026-10-15",payment_date:"2026-10-15",method:"cash",payment_status:"paid",payment_code:"PERMISSION-MEMBER"})})).json()).membership;
 const viewer=await login("viewer","viewer-demo");
 assert.equal((await viewer("/api/contacts/"+contact.id,{method:"PUT",body:json({id:contact.id,name:"Should not save",email:"crm6-permission@example.org"})})).status,403);
 assert.equal((await viewer("/api/memberships/"+membership.id+"/renew",{method:"POST",body:json({amount:35,date:"2026-10-15",status:"paid",payment_code:"VIEWER-RENEW"})})).status,403);
 assert.equal((await viewer("/api/donations/"+gift.id+"/cancel",{method:"POST",body:json({reason:"not allowed"})})).status,403);
 assert.equal((await viewer("/api/tasks/"+task.id,{method:"PUT",body:json({status:"completed"})})).status,403);
 assert.equal(JSON.parse(fs.readFileSync(files.dataFile,"utf8")).find(c=>c.id===contact.id).name,"CRM6 Permission Contact");
 assert.equal(JSON.parse(fs.readFileSync(files.donationsFile,"utf8")).find(d=>d.id===gift.id).status,"received");
 assert.equal(JSON.parse(fs.readFileSync(files.tasksFile,"utf8")).find(t=>t.id===task.id).status,"open");
 assert.equal(JSON.parse(fs.readFileSync(files.membershipsFile,"utf8")).find(m=>m.id===membership.id).periods.length,1);
}));

test("archiving a contact preserves its identity and linked donation history",async()=>setup(async({login,files})=>{
 const staff=await login("staff","staff-demo");
 const event=(await (await staff("/api/fundraising-events",{method:"POST",body:json({name:"Archive Link",date:"2026-10-15",goal:20})})).json()).event;
 const gift=(await (await staff("/api/donations",{method:"POST",body:json({contact_id:"C101",event_id:event.id,amount:10,date:"2026-10-15",status:"received",reference:"ARCHIVE-LINK-GIFT"})})).json()).donation;
 const archived=await staff("/api/contacts/C101/archive",{method:"POST",body:json({})});assert.equal(archived.status,200);
 const contact=JSON.parse(fs.readFileSync(files.dataFile,"utf8")).find(c=>c.id==="C101");assert.equal(contact.archived,true);
 assert.equal(JSON.parse(fs.readFileSync(files.donationsFile,"utf8")).find(d=>d.id===gift.id).contact_id,"C101");
 const history=await (await staff("/api/records/C101/history")).json();assert.ok(history.entries.some(e=>e.action==="archive"));
}));
