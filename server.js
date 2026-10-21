const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const DEFAULT_DATA_FILE = path.join(ROOT, "data", "contacts.json");
const DEFAULT_HOUSEHOLDS_FILE = path.join(ROOT, "data", "households.json");
const DEFAULT_AUDIT_FILE = path.join(ROOT, "data", "audit-log.json");
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
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname === "/api/login" && req.method === "POST") {
        const body = await readBody(req);
        const found = DEMO_USERS.find(u => u.username === cleanString(body.username) && u.password === body.password);
        if (!found) return sendJson(res, 401, { error: "Invalid username or password." });
        const token = crypto.randomBytes(24).toString("hex");
        const user = { id: found.id, username: found.username, role: found.role };
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
        return sendJson(res, 200, { user: user || null });
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
          email_opt_in: body.email_opt_in === true || body.email_opt_in === "true",
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
      if (url.pathname === "/api/settings" && req.method !== "GET") {
        const user = requireUser(req, res); if (!user) return;
        if (!requireRole(user, ["admin"], res)) return;
        return sendJson(res, 501, { error: "Settings updates are not implemented yet." });
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
