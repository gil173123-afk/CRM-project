const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const DEFAULT_DATA_FILE = path.join(ROOT, "data", "contacts.json");
const DEFAULT_HOUSEHOLDS_FILE = path.join(ROOT, "data", "households.json");
const DEFAULT_AUDIT_FILE = path.join(ROOT, "data", "audit-log.json");
const DEFAULT_USERS_FILE = path.join(ROOT, "data", "users.json");
const DEFAULT_SETTINGS_FILE = path.join(ROOT, "data", "settings.json");
const DEFAULT_MEMBERSHIPS_FILE = path.join(ROOT, "data", "memberships.json");
const DEFAULT_PAYMENTS_FILE = path.join(ROOT, "data", "payments.json");
const DEFAULT_PLANS_FILE = path.join(ROOT, "data", "membership-plans.json");
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
const DEMO_USERS = [
  { id: "admin-demo", username: "admin", password: "admin-demo", role: "admin" },
  { id: "staff-demo", username: "staff", password: "staff-demo", role: "staff" },
  { id: "viewer-demo", username: "viewer", password: "viewer-demo", role: "viewer" }
];
const sessions = new Map();

function readArray(file) {
  try { const parsed = JSON.parse(fs.readFileSync(file, "utf8")); return Array.isArray(parsed) ? parsed : []; }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
}
function writeArray(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + "." + process.pid + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", "utf8");
  fs.renameSync(temp, file);
}
function readContacts(file = DEFAULT_DATA_FILE) { return readArray(file); }
function writeContacts(file, contacts) { writeArray(file, contacts); }
function sendJson(res, status, value, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(value));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 100_000) reject(Object.assign(new Error("Request body too large"), { statusCode: 413 }));
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { reject(Object.assign(new Error("Request body must be valid JSON"), { statusCode: 400 })); }
    });
    req.on("error", reject);
  });
}
function cleanString(value) { return typeof value === "string" ? value.trim() : ""; }
function validateContact(body, contacts, existingId = null) {
  const name = cleanString(body.name);
  const email = cleanString(body.email);
  if (!name) return "Name is required.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address or leave it blank.";
  if (email && contacts.some(c => c.id !== existingId && cleanString(c.email).toLowerCase() === email.toLowerCase())) return "That email address is already in use.";
  const householdId = body.household_id == null || body.household_id === "" ? null : cleanString(body.household_id);
  return { name, email, householdId };
}
function createServer(options = {}) {
  const dataFile = options.dataFile || DEFAULT_DATA_FILE;
  const householdsFile = options.householdsFile || DEFAULT_HOUSEHOLDS_FILE;
  const auditFile = options.auditFile || DEFAULT_AUDIT_FILE;
  const usersFile = options.usersFile || DEFAULT_USERS_FILE;
  const settingsFile = options.settingsFile || DEFAULT_SETTINGS_FILE;
  const membershipsFile = options.membershipsFile || DEFAULT_MEMBERSHIPS_FILE;
  const paymentsFile = options.paymentsFile || DEFAULT_PAYMENTS_FILE;
  const plansFile = options.plansFile || DEFAULT_PLANS_FILE;
  const userSessions = options.sessions || sessions;
  function currentUser(req) {
    const cookie = (req.headers.cookie || "").split(";").map(v => v.trim()).find(v => v.startsWith("crm_session="));
    return cookie ? userSessions.get(cookie.slice("crm_session=".length)) || null : null;
  }
  function audit(user, contactId, action) {
    const logs = readArray(auditFile);
    logs.push({ actor: user?.id || "system", contact_id: contactId, action, timestamp: new Date().toISOString() });
    writeArray(auditFile, logs);
  }
  function requireUser(req, res) {
    const user = currentUser(req);
    if (!user) { sendJson(res, 401, { error: "Please log in first." }); return null; }
    return user;
  }
  function requireRole(user, roles, res) {
    if (!roles.includes(user.role)) { sendJson(res, 403, { error: "Your role cannot perform this action." }); return false; }
    return true;
  }
  const defaultPlans = [
    { id: "individual", name: "Individual", price: 35, duration_years: 1 },
    { id: "family", name: "Family", price: 40, duration_years: 1 },
    { id: "student_senior", name: "Student / Senior", price: 30, duration_years: 1 }
  ];
  function plans() { const saved = readArray(plansFile); return saved.length ? saved : defaultPlans; }
  function validDate(value) {
    if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
    const d = new Date(value + "T00:00:00.000Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }
  function addCalendarYear(value) {
    const [year, month, day] = value.split("-").map(Number);
    const nextYear = year + 1;
    const lastDay = new Date(Date.UTC(nextYear, month, 0)).getUTCDate();
    return nextYear + "-" + String(month).padStart(2,"0") + "-" + String(Math.min(day,lastDay)).padStart(2,"0");
  }
  function dayDifference(later, earlier) {
    return Math.round((Date.parse(later + "T00:00:00Z") - Date.parse(earlier + "T00:00:00Z")) / 86400000);
  }
  function paidPeriods(m) {
    if (Array.isArray(m.periods)) return m.periods.filter(p => p.payment_status === "paid" || p.status === "paid");
    return m.payment_status === "paid" && validDate(m.start_date) && validDate(m.end_date)
      ? [{ start_date: m.start_date, end_date: m.end_date, price: m.price, payment_status: "paid", payment_code: m.payment_code }] : [];
  }
  function memberStatus(m, asOf) {
    const periods = paidPeriods(m);
    if (periods.some(p => p.start_date <= asOf && asOf < p.end_date)) return "active";
    if (periods.length && periods.some(p => p.end_date <= asOf)) return "expired";
    return "pending";
  }
  function coveredIds(m, contacts, households) {
    if (m.household_id) {
      const household = households.find(h => h.id === m.household_id);
      if (household) return household.contact_ids || contacts.filter(c => c.household_id === m.household_id).map(c => c.id);
    }
    return m.contact_id ? [m.contact_id] : [];
  }
  function membershipDashboard(asOf) {
    const memberships = readArray(membershipsFile), contacts = readContacts(dataFile), households = readArray(householdsFile);
    const items = memberships.map(m => {
      const periods = paidPeriods(m);
      const status = memberStatus(m, asOf);
      const current = periods.filter(p => p.start_date <= asOf && asOf < p.end_date).sort((a,b)=>b.end_date.localeCompare(a.end_date))[0];
      const end = current?.end_date || m.end_date || null;
      const daysLeft = status === "active" && end ? dayDifference(end, asOf) : null;
      const people = coveredIds(m, contacts, households);
      return { ...m, periods, status, days_left: daysLeft, expiring: status === "active" && daysLeft >= 1 && daysLeft <= 30, covered_people: people.length };
    });
    const active = items.filter(m=>m.status==="active"), expiring=active.filter(m=>m.expiring), expired=items.filter(m=>m.status==="expired"), pending=items.filter(m=>m.status==="pending");
    const people = new Set(active.flatMap(m=>coveredIds(m,contacts,households)));
    return { as_of: asOf, memberships: items, counts: { paid_memberships: active.length, active_memberships: active.length, expiring_memberships: expiring.length, expired_memberships: expired.length, pending_memberships: pending.length, covered_people: people.size }, plans: plans(), payments: readArray(paymentsFile) };
  }
  function auditMembership(user, id, action) {
    const logs = readArray(auditFile);
    logs.push({ actor: user?.id || "system", membership_id: id, action, timestamp: new Date().toISOString() });
    writeArray(auditFile, logs);
  }
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname === "/api/login" && req.method === "POST") {
        const body = await readBody(req);
        const users = [...DEMO_USERS, ...readArray(usersFile)];
        const found = users.find(u => u.username === cleanString(body.username) && u.password === body.password && !u.disabled);
        if (!found) return sendJson(res, 401, { error: "Invalid username or password." });
        const token = crypto.randomBytes(24).toString("hex");
        const user = { id: found.id, username: found.username, role: found.role, default_email_opt_in: Boolean(readArray(settingsFile)[0]?.default_email_opt_in) };
        userSessions.set(token, user);
        return sendJson(res, 200, { user }, { "Set-Cookie": "crm_session=" + token + "; HttpOnly; SameSite=Strict; Path=/" });
      }
      if (url.pathname === "/api/logout" && req.method === "POST") {
        const cookie = (req.headers.cookie || "").split(";").map(v => v.trim()).find(v => v.startsWith("crm_session="));
        if (cookie) userSessions.delete(cookie.slice("crm_session=".length));
        return sendJson(res, 200, { ok: true }, { "Set-Cookie": "crm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
      }
      if (url.pathname === "/api/me" && req.method === "GET") {
        const user = currentUser(req);
        return sendJson(res, 200, { user: user ? { ...user, default_email_opt_in: Boolean(readArray(settingsFile)[0]?.default_email_opt_in) } : null });
      }
      if (url.pathname === "/api/contacts" && req.method === "GET") {
        const query = (url.searchParams.get("q") || "").trim().toLowerCase();
        const tag = (url.searchParams.get("tag") || "").trim().toLowerCase();
        const archived = url.searchParams.get("archived") === "true";
        const contacts = readContacts(dataFile).filter(c => Boolean(c.archived) === archived)
          .filter(c => [c.name, c.organization, c.email, c.phone, c.id].some(v => String(v || "").toLowerCase().includes(query)))
          .filter(c => !tag || (c.tags || []).some(t => String(t).toLowerCase() === tag));
        return sendJson(res, 200, { contacts });
      }
      if (url.pathname === "/api/households" && req.method === "GET") {
        return sendJson(res, 200, { households: readArray(householdsFile) });
      }
      if (url.pathname === "/api/audit" && req.method === "GET") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin"], res)) return;
        return sendJson(res, 200, { entries: readArray(auditFile) });
      }
      if (url.pathname === "/api/contacts" && req.method === "POST") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin", "staff"], res)) return;
        const body = await readBody(req);
        const contacts = readContacts(dataFile);
        const valid = validateContact(body, contacts);
        if (typeof valid === "string") return sendJson(res, 400, { error: valid });
        const households = readArray(householdsFile);
        if (valid.householdId && !households.some(h => h.id === valid.householdId)) return sendJson(res, 400, { error: "Choose an existing household." });
        const contact = {
          id: cleanString(body.id) || "C-" + crypto.randomUUID(),
          name: valid.name,
          organization: cleanString(body.organization),
          email: valid.email,
          phone: cleanString(body.phone),
          notes: cleanString(body.notes),
          tags: Array.isArray(body.tags) ? [...new Set(body.tags.map(cleanString).filter(Boolean))] : [],
          household_id: valid.householdId,
          email_opt_in: body.email_opt_in === true || body.email_opt_in === "true" || (body.email_opt_in === undefined && Boolean(readArray(settingsFile)[0]?.default_email_opt_in)),
          archived: false
        };
        if (contacts.some(c => c.id === contact.id)) return sendJson(res, 400, { error: "That contact ID already exists." });
        contacts.unshift(contact);
        writeContacts(dataFile, contacts);
        audit(user, contact.id, "create");
        return sendJson(res, 201, { contact });
      }
      const archiveMatch = url.pathname.match(/^\/api\/contacts\/([^/]+)\/archive$/);
      if (archiveMatch && req.method === "POST") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin", "staff"], res)) return;
        const id = decodeURIComponent(archiveMatch[1]);
        const contacts = readContacts(dataFile);
        const index = contacts.findIndex(c => c.id === id);
        if (index < 0) return sendJson(res, 404, { error: "Contact not found." });
        contacts[index].archived = true;
        writeContacts(dataFile, contacts);
        audit(user, id, "archive");
        return sendJson(res, 200, { contact: contacts[index] });
      }
      const contactMatch = url.pathname.match(/^\/api\/contacts\/([^/]+)$/);
      if (contactMatch && req.method === "PUT") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin", "staff"], res)) return;
        const id = decodeURIComponent(contactMatch[1]);
        const contacts = readContacts(dataFile);
        const index = contacts.findIndex(c => c.id === id);
        if (index < 0) return sendJson(res, 404, { error: "Contact not found." });
        const body = await readBody(req);
        if (body.id && body.id !== id) return sendJson(res, 400, { error: "Contact ID cannot be changed." });
        const valid = validateContact(body, contacts, id);
        if (typeof valid === "string") return sendJson(res, 400, { error: valid });
        const households = readArray(householdsFile);
        if (valid.householdId && !households.some(h => h.id === valid.householdId)) return sendJson(res, 400, { error: "Choose an existing household." });
        const old = contacts[index];
        contacts[index] = { ...old, name: valid.name, organization: cleanString(body.organization), email: valid.email,
          phone: cleanString(body.phone), notes: cleanString(body.notes),
          tags: Array.isArray(body.tags) ? [...new Set(body.tags.map(cleanString).filter(Boolean))] : old.tags || [],
          household_id: valid.householdId, email_opt_in: body.email_opt_in === true || body.email_opt_in === "true" };
        writeContacts(dataFile, contacts);
        audit(user, id, "edit");
        return sendJson(res, 200, { contact: contacts[index] });
      }
      if (url.pathname === "/api/admin/users" && req.method === "GET") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin"], res)) return;
        const users = [...DEMO_USERS.map(({ id, username, role }) => ({ id, username, role, protected: true })), ...readArray(usersFile).map(({ id, username, role, disabled }) => ({ id, username, role, disabled: Boolean(disabled), protected: false }))];
        return sendJson(res, 200, { users });
      }
      if (url.pathname === "/api/admin/users" && req.method === "POST") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin"], res)) return;
        const body = await readBody(req), username = cleanString(body.username), password = typeof body.password === "string" ? body.password : "", role = cleanString(body.role);
        if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) return sendJson(res, 400, { error: "Username must be 3–32 letters, numbers, underscores or hyphens." });
        if (password.length < 8) return sendJson(res, 400, { error: "Password must contain at least 8 characters." });
        if (!["admin", "staff", "viewer"].includes(role)) return sendJson(res, 400, { error: "Choose admin, staff, or viewer." });
        const users = readArray(usersFile);
        if ([...DEMO_USERS, ...users].some(existing => existing.username.toLowerCase() === username.toLowerCase())) return sendJson(res, 400, { error: "That username already exists." });
        const created = { id: "user-" + crypto.randomUUID(), username, password, role, disabled: false };
        users.push(created); writeArray(usersFile, users); audit(user, created.id, "create-user");
        return sendJson(res, 201, { user: { id: created.id, username: created.username, role: created.role } });
      }
      if (url.pathname.startsWith("/api/admin/users/") && req.method === "DELETE") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin"], res)) return;
        const id = decodeURIComponent(url.pathname.slice("/api/admin/users/".length)), users = readArray(usersFile), index = users.findIndex(existing => existing.id === id);
        if (index < 0) return sendJson(res, 404, { error: "User not found or demo account is protected." });
        if (users[index].id === user.id) return sendJson(res, 400, { error: "You cannot delete your own account while signed in." });
        users.splice(index, 1); writeArray(usersFile, users); audit(user, id, "delete-user");
        return sendJson(res, 200, { ok: true });
      }
      if (url.pathname === "/api/memberships" && req.method === "GET") {
        const asOf = url.searchParams.get("as_of") || "2026-10-15";
        if (!validDate(asOf)) return sendJson(res, 400, { error: "As of must be a real calendar date in YYYY-MM-DD format." });
        const result = membershipDashboard(asOf);
        const status = url.searchParams.get("status");
        if (status) result.memberships = result.memberships.filter(m => status === "expiring" ? m.expiring : m.status === status);
        return sendJson(res, 200, result);
      }
      if (url.pathname === "/api/membership-plans" && req.method === "GET") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin"], res)) return;
        return sendJson(res, 200, { plans: plans() });
      }
      if (url.pathname === "/api/membership-plans" && req.method === "PUT") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin"], res)) return;
        const body = await readBody(req);
        if (!Array.isArray(body.plans) || body.plans.length !== 3) return sendJson(res, 400, { error: "Provide all three membership plans." });
        const expected = new Map(defaultPlans.map(p=>[p.id,p]));
        const next = [];
        for (const plan of body.plans) {
          const base = expected.get(plan.id), price = Number(plan.price);
          if (!base || !Number.isFinite(price) || price <= 0 || price > 10000 || Number(plan.duration_years) !== 1) return sendJson(res, 400, { error: "Each plan needs a valid positive price and a one-year duration." });
          next.push({ ...base, price });
        }
        writeArray(plansFile, next); auditMembership(user, "plans", "update-plans");
        return sendJson(res, 200, { plans: next });
      }
      if (url.pathname === "/api/memberships" && req.method === "POST") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin", "staff"], res)) return;
        const body = await readBody(req), contacts = readContacts(dataFile), households = readArray(householdsFile);
        const contact = contacts.find(c=>c.id===cleanString(body.contact_id));
        const householdId = cleanString(body.household_id) || null;
        if (!contact) return sendJson(res, 400, { error: "Choose an existing contact." });
        if (householdId && !households.some(h=>h.id===householdId)) return sendJson(res, 400, { error: "Choose an existing household." });
        const plan = plans().find(p=>p.id===body.plan);
        if (!plan) return sendJson(res, 400, { error: "Choose a valid membership plan." });
        const amount = Number(body.amount), paymentStatus = cleanString(body.payment_status || "paid"), paymentCode = cleanString(body.payment_code), paymentDate = cleanString(body.payment_date), startDate = cleanString(body.start_date || paymentDate);
        if (!["paid","pending","failed"].includes(paymentStatus)) return sendJson(res, 400, { error: "Payment status must be paid, pending, or failed." });
        if (amount !== Number(plan.price)) return sendJson(res, 400, { error: "Payment amount must match the plan price." });
        if (!validDate(paymentDate) || (paymentStatus==="paid" && !validDate(startDate))) return sendJson(res, 400, { error: "Enter a real payment date and start date." });
        if (!paymentCode) return sendJson(res, 400, { error: "A unique payment code is required." });
        const payments = readArray(paymentsFile);
        if (payments.some(p=>p.payment_code.toLowerCase()===paymentCode.toLowerCase())) return sendJson(res, 409, { error: "That payment code has already been used." });
        const id = "M-" + crypto.randomUUID();
        const period = paymentStatus==="paid" ? { start_date:startDate, end_date:addCalendarYear(startDate), price:amount, payment_status:"paid", payment_code:paymentCode } : null;
        const membership = { id, contact_id:contact.id, household_id:householdId, plan:plan.id, price:amount, payment_status:paymentStatus, start_date:period?.start_date||null, end_date:period?.end_date||null, periods:period?[period]:[], created_at:new Date().toISOString() };
        const payment = { id:"P-"+crypto.randomUUID(), membership_id:id, payment_code:paymentCode, amount, date:paymentDate, method:cleanString(body.method)||"other", status:paymentStatus, created_by:user.id, created_at:new Date().toISOString() };
        const memberships=readArray(membershipsFile); memberships.push(membership); payments.push(payment);
        writeArray(membershipsFile,memberships); writeArray(paymentsFile,payments); auditMembership(user,id,"create-membership"); auditMembership(user,id,"record-payment");
        return sendJson(res,201,{membership,payment});
      }
      const renewMatch = url.pathname.match(/^\\/api\\/memberships\\/([^/]+)\\/renew$/);
      if (renewMatch && req.method === "POST") {
        const user = requireUser(req,res); if (!user) return;
        if (!requireRole(user,["admin","staff"],res)) return;
        const id=decodeURIComponent(renewMatch[1]), memberships=readArray(membershipsFile), index=memberships.findIndex(m=>m.id===id);
        if(index<0) return sendJson(res,404,{error:"Membership not found."});
        const body=await readBody(req), amount=Number(body.amount), date=cleanString(body.date), method=cleanString(body.method)||"other", status=cleanString(body.status||"paid"), code=cleanString(body.payment_code);
        if(!["paid","pending","failed"].includes(status)) return sendJson(res,400,{error:"Payment status must be paid, pending, or failed."});
        if(!validDate(date)) return sendJson(res,400,{error:"Enter a real payment date."});
        if(!code) return sendJson(res,400,{error:"A unique payment code is required."});
        const payments=readArray(paymentsFile), duplicate=payments.find(p=>p.payment_code.toLowerCase()===code.toLowerCase());
        if(duplicate) {
          if(status==="paid"&&duplicate.status==="paid"&&duplicate.membership_id===id&&Number(duplicate.amount)===amount&&duplicate.date===date) return sendJson(res,200,{membership:memberships[index],payment:duplicate,idempotent:true});
          return sendJson(res,409,{error:"That payment code has already been used."});
        }
        if(amount!==Number(memberships[index].price)) return sendJson(res,400,{error:"Payment amount must match the price saved on this membership period."});
        const payment={id:"P-"+crypto.randomUUID(),membership_id:id,payment_code:code,amount,date,method,status,created_by:user.id,created_at:new Date().toISOString()};
        const updated={...memberships[index],periods:paidPeriods(memberships[index])};
        if(status==="paid"){
          const existingEnd=updated.periods.reduce((latest,p)=>p.end_date>latest?p.end_date:latest,"");
          const start=existingEnd&&date<=existingEnd?existingEnd:date;
          const period={start_date:start,end_date:addCalendarYear(start),price:amount,payment_status:"paid",payment_code:code};
          updated.periods.push(period); updated.payment_status="paid"; updated.start_date=updated.periods[0].start_date;
          updated.end_date=updated.periods.reduce((latest,p)=>p.end_date>latest?p.end_date:latest,"");
        }
        memberships[index]=updated; payments.push(payment);
        writeArray(membershipsFile,memberships); writeArray(paymentsFile,payments);
        auditMembership(user,id,status==="paid"?"renew-membership":"record-"+status+"-renewal"); auditMembership(user,id,"record-payment");
        return sendJson(res,200,{membership:updated,payment});
      }
      if (url.pathname === "/api/payments" && req.method === "GET") {
        const user=requireUser(req,res); if(!user)return;
        if(!requireRole(user,["admin","staff"],res))return;
        return sendJson(res,200,{payments:readArray(paymentsFile)});
      }
      if (url.pathname === "/api/settings" && req.method === "GET") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin"], res)) return;
        return sendJson(res, 200, { settings: readArray(settingsFile)[0] || { organization_name: "North Star CRM", default_email_opt_in: false } });
      }
      if (url.pathname === "/api/settings" && req.method === "PUT") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin"], res)) return;
        const body = await readBody(req), organization_name = cleanString(body.organization_name);
        if (!organization_name) return sendJson(res, 400, { error: "Organization name is required." });
        const settings = { organization_name: organization_name.slice(0, 120), default_email_opt_in: body.default_email_opt_in === true };
        writeArray(settingsFile, [settings]); audit(user, "settings", "update-settings");
        return sendJson(res, 200, { settings });
      }
      if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "Method not allowed." });
      const requested = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = path.resolve(ROOT, "public", "." + requested);
      const publicRoot = path.resolve(ROOT, "public") + path.sep;
      if (!filePath.startsWith(publicRoot)) return sendJson(res, 403, { error: "Forbidden." });
      fs.readFile(filePath, (error, content) => {
        if (error) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Not found"); }
        res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
        res.end(req.method === "HEAD" ? undefined : content);
      });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : "Could not complete request." });
    }
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => console.log("CRM starter running at http://localhost:" + port));
}
module.exports = { createServer, readContacts, writeContacts };
