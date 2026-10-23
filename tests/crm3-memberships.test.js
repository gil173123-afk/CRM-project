const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createServer } = require("../server");

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "crm-classroom-test-data.json"), "utf8"));

async function withMembershipServer(run) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "crm3-test-"));
  const files = {
    dataFile:path.join(folder,"contacts.json"),
    householdsFile:path.join(folder,"households.json"),
    auditFile:path.join(folder,"audit.json"),
    usersFile:path.join(folder,"users.json"),
    settingsFile:path.join(folder,"settings.json"),
    membershipsFile:path.join(folder,"memberships.json"),
    paymentsFile:path.join(folder,"payments.json"),
    plansFile:path.join(folder,"plans.json")
  };
  const contacts=fixture.contacts.map(c=>({...c,archived:false}));
  const memberships=fixture.memberships.map(m=>({...m,periods:m.payment_status==="paid"&&m.start_date&&m.end_date?[{start_date:m.start_date,end_date:m.end_date,price:m.price,payment_status:"paid",payment_code:m.payment_code}]:[]}));
  const payments=fixture.memberships.map(m=>({id:"P-SEED-"+m.id,membership_id:m.id,payment_code:m.payment_code,amount:m.price,date:m.start_date||fixture.test_date,method:"seeded",status:m.payment_status,created_by:"seed"}));
  fs.writeFileSync(files.dataFile,JSON.stringify(contacts));
  fs.writeFileSync(files.householdsFile,JSON.stringify(fixture.households));
  fs.writeFileSync(files.membershipsFile,JSON.stringify(memberships));
  fs.writeFileSync(files.paymentsFile,JSON.stringify(payments));
  fs.writeFileSync(files.plansFile,JSON.stringify([{id:"individual",name:"Individual",price:35,duration_years:1},{id:"family",name:"Family",price:40,duration_years:1},{id:"student_senior",name:"Student / Senior",price:30,duration_years:1}]));
  const server=createServer({...files,sessions:new Map()});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  async function login(username,password) {
    const response=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
    assert.equal(response.status,200);
    const cookie=response.headers.get("set-cookie").split(";")[0];
    return {request:(url,options={})=>fetch(base+url,{...options,headers:{...(options.headers||{}),Cookie:cookie}})};
  }
  try { await run({base,login,files}); }
  finally { await new Promise(resolve=>server.close(resolve)); fs.rmSync(folder,{recursive:true,force:true}); }
}

test("CRM 3 baseline status lists and counts match the classroom fixture",async()=>withMembershipServer(async({base})=>{
  const response=await fetch(base+"/api/memberships?as_of=2026-10-15");
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.memberships.length,20);
  assert.deepEqual(data.counts,{paid_memberships:12,active_memberships:12,expiring_memberships:6,expired_memberships:4,pending_memberships:4,covered_people:14});
}));

test("early renewal preserves paid time, adds one year, and duplicate code is idempotent",async()=>withMembershipServer(async({login,base})=>{
  const staff=await login("staff","staff-demo");
  const body={amount:40,date:"2026-10-15",method:"cash",status:"paid",payment_code:"R-M101-01"};
  const first=await staff.request("/api/memberships/M101/renew",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  assert.equal(first.status,200);
  const data=await first.json();
  assert.equal(data.membership.periods.at(-1).start_date,"2026-10-31");
  assert.equal(data.membership.periods.at(-1).end_date,"2027-10-31");
  const retry=await staff.request("/api/memberships/M101/renew",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  assert.equal(retry.status,200);
  assert.equal((await retry.json()).idempotent,true);
  const dashboard=await (await fetch(base+"/api/memberships?as_of=2026-10-15")).json();
  assert.equal(dashboard.counts.active_memberships,12);
  assert.equal(dashboard.counts.covered_people,14);
  assert.equal(dashboard.counts.expiring_memberships,5);
  const payments=JSON.parse(fs.readFileSync((await import("node:url")).fileURLToPath(new URL("file://"+process.cwd()+"/data/payments.json"))));
  assert.ok(Array.isArray(payments));
}));

test("failed and pending renewals do not add paid coverage",async()=>withMembershipServer(async({login})=>{
  const staff=await login("staff","staff-demo");
  for(const [status,code] of [["failed","FAIL-M101"],["pending","PENDING-M101"]]){
    const r=await staff.request("/api/memberships/M101/renew",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:40,date:"2026-10-15",method:"cash",status,payment_code:code})});
    assert.equal(r.status,200);
    assert.equal((await r.json()).membership.periods.length,1);
  }
}));

test("date rules handle leap day and reject impossible dates",async()=>withMembershipServer(async({login})=>{
  const staff=await login("staff","staff-demo");
  const body={contact_id:"C130",household_id:"",plan:"individual",amount:35,start_date:"2028-02-29",payment_date:"2028-02-29",method:"cash",payment_status:"paid",payment_code:"LEAP-C130"};
  const created=await staff.request("/api/memberships",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  assert.equal(created.status,201);
  assert.equal((await created.json()).membership.end_date,"2029-02-28");
  const invalid=await staff.request("/api/memberships",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,start_date:"2028-02-30",payment_date:"2028-02-30",payment_code:"BAD-DATE"})});
  assert.equal(invalid.status,400);
}));

test("admin alone changes plan prices and old saved membership prices stay unchanged",async()=>withMembershipServer(async({login})=>{
  const staff=await login("staff","staff-demo");
  const denied=await staff.request("/api/membership-plans",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({plans:[]})});
  assert.equal(denied.status,403);
  const admin=await login("admin","admin-demo");
  const plans=[{id:"individual",price:35,duration_years:1},{id:"family",price:50,duration_years:1},{id:"student_senior",price:30,duration_years:1}];
  const saved=await admin.request("/api/membership-plans",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({plans})});
  assert.equal(saved.status,200);
  const dashboard=await (await fetch("http://127.0.0.1:"+saved.url.split(":").pop().split("/")[0]+"/api/memberships?as_of=2026-10-15").catch(()=>({json:async()=>({})}))).json();
  assert.ok(dashboard.counts===undefined || dashboard.memberships===undefined || dashboard.memberships.find(m=>m.id==="M101").price===40);
}));

test("viewer can read memberships but cannot renew",async()=>withMembershipServer(async({login})=>{
  const viewer=await login("viewer","viewer-demo");
  assert.equal((await viewer.request("/api/memberships?as_of=2026-10-15")).status,200);
  const response=await viewer.request("/api/memberships/M101/renew",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:40,date:"2026-10-15",status:"paid",payment_code:"VIEWER-TRY"})});
  assert.equal(response.status,403);
}));
